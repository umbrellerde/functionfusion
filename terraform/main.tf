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
  for_each      = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
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
  for_each = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
  name     = "/aws/lambda/${aws_lambda_function.hello_world[each.value].function_name}"

  retention_in_days = 5
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

resource "aws_apigatewayv2_api" "lambda" {
  name          = "serverless_lambda_gw"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "serverless_lambda_stage"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_apigatewayv2_integration" "hello_world" {
  for_each = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
  api_id   = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.hello_world[each.value].invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "hello_world" {
  for_each = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
  api_id   = aws_apigatewayv2_api.lambda.id

  route_key = "GET /${each.value}"
  target    = "integrations/${aws_apigatewayv2_integration.hello_world[each.value].id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

  retention_in_days = 5
}

resource "aws_lambda_permission" "api_gw" {
  for_each      = toset([for file in fileset("${path.module}/../function/fusionables/**", "handler.js") : basename(dirname(file))])
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hello_world[each.value].function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}
