terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      //version = "~> 3.74"
      version = "~> 4.20"
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
  force_destroy = true
}

resource "aws_s3_bucket_policy" "lambda_bucket_policy" {
  bucket = aws_s3_bucket.lambda_bucket.id
  policy = data.aws_iam_policy_document.allow_access_from_cloudwatch.json
  # policy = jsonencode({ 
  #   "Version": "2012-10-17",
  #   "Statement": [
  #     {
  #         "Action": "s3:GetBucketAcl",
  #         "Effect": "Allow",
  #         "Resource": "*"
  #         "Principal": { "Service": "logs.${var.aws_region}.amazonaws.com" }
  #     }
  #     ,
  #     {
  #         "Action": "s3:PutObject" ,
  #         "Effect": "Allow",
  #         "Resource": "*",
  #         "Principal": { "Service": "logs.${var.aws_region}.amazonaws.com" }
  #     }
  #   ]
  # })
}

data "aws_iam_policy_document" "allow_access_from_cloudwatch" {
  # Version = "2012-10-17"
  # Statement = {
  #   {
  #     Action = "s3:GetBucketAcl",
  #     Effect = "Allow",
  #     Resource = "arn:aws:s3:::*"
  #     Principal = {Service = "logs.${var.aws_region}.amazonaws.com"}
  #   },
  #   {
  #     Action = "s3:PutObject",
  #     Effect = "Allow",
  #     Resource = "arn:aws:s3:::*"
  #     Principal = {Service = "logs.${var.aws_region}.amazonaws.com"}
  #   }
  # }
  statement {
    actions = [
      "s3:GetBucketAcl", "s3:PutObject"
    ]

    resources = [ 
      "arn:aws:s3:::${aws_s3_bucket.lambda_bucket.id}/*",
      "arn:aws:s3:::${aws_s3_bucket.lambda_bucket.id}"
      ]
    principals {
      type = "Service"
      identifiers = [ "logs.${var.aws_region}.amazonaws.com" ]
    }
  }
}

resource "aws_s3_bucket_acl" "lambda_bucket_acl" {
  bucket = aws_s3_bucket.lambda_bucket.id
  acl    = "private"
  depends_on = [ aws_s3_bucket_ownership_controls.s3_bucket_acl_ownership ]
}

# https://stackoverflow.com/questions/76049290/error-accesscontrollistnotsupported-when-trying-to-create-a-bucket-acl-in-aws
# Resource to avoid error "AccessControlListNotSupported: The bucket does not allow ACLs"
resource "aws_s3_bucket_ownership_controls" "s3_bucket_acl_ownership" {
  bucket = aws_s3_bucket.lambda_bucket.id
  rule {
    object_ownership = "ObjectWriter"
  }
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
    module.fusionfunction, module.optideployer, module.coldstarts, module.optimizer
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
  memory_sizes = var.memory_sizes
  lambda_bucket = aws_s3_bucket.lambda_bucket
  lambda_exec = aws_iam_role.lambda_exec
  api = aws_api_gateway_rest_api.api
}