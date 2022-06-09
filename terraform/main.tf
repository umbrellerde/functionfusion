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

  source_dir  = "${path.module}/../${var.use_case}"
  output_path = "${path.module}/../function.zip"
}

resource "aws_s3_bucket_object" "lambda_fusion_manager" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "originalCode/function.zip"
  source = data.archive_file.lambda_fusion_manager.output_path
  etag   = filemd5(data.archive_file.lambda_fusion_manager.output_path)
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

// API v1 Gateway
resource "aws_api_gateway_rest_api" "api" {
  name = "lambda-api"
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  depends_on = [
    module.fusionfunction
  ]

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

// Function Module

module "fusionfunction" {
  source = "./fusionfunction"
  use_case = var.use_case
  memory_sizes = [128]
  lambda_bucket = aws_s3_bucket.lambda_bucket
  lambda_fusion_manager = aws_s3_bucket_object.lambda_fusion_manager
  lambda_exec = aws_iam_role.lambda_exec
  source_code_archive = data.archive_file.lambda_fusion_manager
  api = aws_api_gateway_rest_api.api
}