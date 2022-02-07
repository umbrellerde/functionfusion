terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.74"

    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1.0"
    }
  }
}

locals {
  function_names = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
}

provider "aws" {
  profile = "default"
  region  = var.aws_region
}

// Random to create a random bucket name

resource "random_pet" "lambda_bucket_name" {
  prefix = var.bucket_name
  length = 4
}

// Bucket with Lambda Source Code in it

resource "aws_s3_bucket" "lambda_bucket" {
  bucket        = random_pet.lambda_bucket_name.id
  acl           = "private"
  force_destroy = true
}

data "archive_file" "lambda_fusion_manager" {
  type = "zip"

  source_dir  = "${path.module}/../function"
  output_path = "${path.module}/../function.zip"
}

resource "aws_s3_bucket_object" "lambda_fusion_manager" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "function.zip"
  source = data.archive_file.lambda_fusion_manager.output_path
  etag   = filemd5(data.archive_file.lambda_fusion_manager.output_path)
}

// Lambda Function

resource "aws_lambda_function" "hello_world" {
  for_each      = local.function_names
  function_name = "fusion-function-${each.value}"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.lambda_fusion_manager.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = data.archive_file.lambda_fusion_manager.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      // TODO set to values of correct bucket
      config_data_bucket = aws_s3_bucket.lambda_bucket.id
      function_to_handle = each.value
    }
  }
}

resource "aws_cloudwatch_log_group" "hello_world" {
  for_each = local.function_names
  name     = "/aws/lambda/${aws_lambda_function.hello_world[each.value].function_name}"

  retention_in_days = 1
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

// API Gateway to call Lambda

# resource "aws_apigatewayv2_api" "lambda" {
#   name          = "serverless_lambda_gw"
#   protocol_type = "HTTP"
# }

# resource "aws_apigatewayv2_stage" "lambda" {
#   api_id = aws_apigatewayv2_api.lambda.id

#   name        = "serverless_lambda_stage"
#   auto_deploy = true

#   access_log_settings {
#     destination_arn = aws_cloudwatch_log_group.api_gw.arn

#     format = jsonencode({
#       requestId               = "$context.requestId"
#       sourceIp                = "$context.identity.sourceIp"
#       requestTime             = "$context.requestTime"
#       protocol                = "$context.protocol"
#       httpMethod              = "$context.httpMethod"
#       resourcePath            = "$context.resourcePath"
#       routeKey                = "$context.routeKey"
#       status                  = "$context.status"
#       responseLength          = "$context.responseLength"
#       integrationErrorMessage = "$context.integrationErrorMessage"
#     })
#   }
# }

# resource "aws_apigatewayv2_integration" "hello_world" {
#   for_each = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
#   api_id   = aws_apigatewayv2_api.lambda.id

#   integration_uri    = aws_lambda_function.hello_world[each.value].invoke_arn
#   integration_type   = "AWS_PROXY"
#   integration_method = "POST"

#   request_parameters = {
#     "overwrite:header.X-Amz-Invocation-Type" : "$request.header.InvocationType"
#   }

#   # request_parameters = {
#   #   "integration.request.header.X-Amz-Invocation-Type" = "method.request.header.InvocationType"
#   # }
# }

# resource "aws_apigatewayv2_route" "hello_world" {
#   for_each = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
#   api_id   = aws_apigatewayv2_api.lambda.id

#   route_key = "POST /${each.value}"
#   target    = "integrations/${aws_apigatewayv2_integration.hello_world[each.value].id}"
# }

# resource "aws_cloudwatch_log_group" "api_gw" {
#   name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

#   retention_in_days = 1
# }

# resource "aws_lambda_permission" "api_gw" {
#   for_each      = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
#   statement_id  = "AllowExecutionFromAPIGateway"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.hello_world[each.value].function_name
#   principal     = "apigateway.amazonaws.com"

#   source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
# }

// API Gateway v1 for async invocations

// TODO require Author-Header for all Apigateway calls
resource "aws_api_gateway_rest_api" "api" {
  name = "lambda-api"
}

resource "aws_api_gateway_resource" "sync_root_resource" {
  for_each    = local.function_names
  path_part   = "SYNC-${each.value}"
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_resource" "async_root_resource" {
  for_each    = local.function_names
  path_part   = each.value
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_request_validator" "validator" {
  name        = "function-validator"
  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  depends_on = [module.async_post_endpoint, module.sync_post_endpoint, aws_api_gateway_integration_response.sync_integration_response]

  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.api.body))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "stage" {
  depends_on    = [aws_cloudwatch_log_group.apigw]
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "onlyStage"
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/aws/apigw/${aws_api_gateway_rest_api.api.id}"
  retention_in_days = 1
}

resource "aws_lambda_permission" "lambda_permission" {
  for_each      = local.function_names
  statement_id  = "AllowLambdaInvokeFromApigateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hello_world[each.value].function_name
  principal     = "apigateway.amazonaws.com"

  # The /*/*/* part allows invocation from any stage, method and resource path
  # within API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
}

module "async_post_endpoint" {
  source                          = "github.com/vladcar/terraform-aws-serverless-common-api-gateway-method.git"
  for_each                        = local.function_names
  http_method                     = "POST"
  integration_type                = "AWS"
  integration_http_method         = "POST"
  async_response_status_code      = "202"
  resource_path                   = aws_api_gateway_resource.async_root_resource[each.value].path_part
  resource_id                     = aws_api_gateway_resource.async_root_resource[each.value].id
  rest_api_id                     = aws_api_gateway_rest_api.api.id
  validator_id                    = aws_api_gateway_request_validator.validator.id
  lambda_invoke_arn               = aws_lambda_function.hello_world[each.value].invoke_arn
  enable_async_lambda_integration = true
}

module "sync_post_endpoint" {
  source                     = "github.com/vladcar/terraform-aws-serverless-common-api-gateway-method.git"
  for_each                   = local.function_names
  http_method                = "POST"
  integration_type           = "AWS"
  integration_http_method    = "POST"
  async_response_status_code = "200"
  resource_path              = aws_api_gateway_resource.sync_root_resource[each.value].path_part
  resource_id                = aws_api_gateway_resource.sync_root_resource[each.value].id
  rest_api_id                = aws_api_gateway_rest_api.api.id
  validator_id               = aws_api_gateway_request_validator.validator.id
  lambda_invoke_arn          = aws_lambda_function.hello_world[each.value].invoke_arn
  //enable_async_lambda_integration = false
}

// Add the default Response for the sync endpoint since the module does not contain them
resource "aws_api_gateway_integration_response" "sync_integration_response" {
  for_each = local.function_names

  depends_on = [
    module.sync_post_endpoint
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.sync_root_resource[each.value].id
  http_method = "POST"
  status_code = "200"

  //selection_pattern = "-"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,PATCH,DELETE'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

