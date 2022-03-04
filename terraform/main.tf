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
  function_names = toset([for file in fileset("${path.module}/../${var.use_case}/fusionables/**", "handler.js") : basename(dirname(file))])
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

  source_dir  = "${path.module}/../${var.use_case}"
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

  timeout = 60

  environment {
    variables = {
      S3_BUCKET_NAME = aws_s3_bucket.lambda_bucket.id
      FUNCTION_TO_HANDLE = each.value
      FUSION_GROUPS = join(".", local.function_names)
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

  inline_policy {
    name = "read_apigw"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["apigateway:GET", "dynamodb:*"]
          Effect   = "Allow"
          Resource = "*"
        }
      ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

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

  depends_on = [module.async_post_endpoint, aws_api_gateway_integration.sync_lambda, aws_api_gateway_integration.sync_lambda_root, aws_api_gateway_method.sync_proxy, aws_api_gateway_method.sync_proxy_root]

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

// Add the sync lambda manually since the module apparently only supports async invocation.
resource "aws_api_gateway_method" "sync_proxy" {
  for_each      = local.function_names
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.sync_root_resource[each.value].id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sync_lambda" {
  for_each    = local.function_names
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.sync_proxy[each.value].resource_id
  http_method = aws_api_gateway_method.sync_proxy[each.value].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.hello_world[each.value].invoke_arn
}

resource "aws_api_gateway_method" "sync_proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_rest_api.api.root_resource_id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sync_lambda_root" {
  for_each                = local.function_names
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_method.sync_proxy_root.resource_id
  http_method             = aws_api_gateway_method.sync_proxy_root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.hello_world[each.value].invoke_arn
}
