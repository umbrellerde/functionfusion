data "archive_file" "optimizer" {
  type = "zip"

  source_dir  = "${path.module}/../optimizer"
  output_path = "${path.module}/../optimizer.zip"
}

resource "aws_s3_bucket_object" "optimizer" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "optimizer.zip"
  source = data.archive_file.optimizer.output_path
  etag   = filemd5(data.archive_file.optimizer.output_path)
}

resource "aws_lambda_function" "optimizer" {
  function_name = "optimizer"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.optimizer.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = data.archive_file.optimizer.output_base64sha256

  role = aws_iam_role.lambda_optimizer.arn

  timeout = 60

  environment {
    variables = {
      NODE_OPTIONS = "--enable-source-maps"
      S3_BUCKET_NAME = aws_s3_bucket.lambda_bucket.id
      FUNCTION_NAMES = join(",",[for function in aws_lambda_function.hello_world : "${function.function_name}"])
    }
  }
}

resource "aws_cloudwatch_log_group" "optimizer" {
  name = "/aws/lambda/optimizer"

  retention_in_days = 1
}

resource "aws_iam_role" "lambda_optimizer" {
  name = "serverless_lambda_optimizer"

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
    name = "read_cw"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["cloudwatch:*", "logs:*", "s3:*", "lambda:*", "kms:*"]
          Effect   = "Allow"
          Resource = "*"
        }
      ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy_optimizer" {
  role       = aws_iam_role.lambda_optimizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

//--------------------------------------------------------------------------------------

data "archive_file" "extractor" {
  type = "zip"

  source_dir  = "${path.module}/../extractor"
  output_path = "${path.module}/../extractor.zip"
}

resource "aws_s3_bucket_object" "extractor" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "extractor.zip"
  source = data.archive_file.extractor.output_path
  etag   = filemd5(data.archive_file.extractor.output_path)
}

resource "aws_lambda_function" "extractor" {
  function_name = "extractor"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.extractor.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = data.archive_file.extractor.output_base64sha256

  role = aws_iam_role.lambda_extractor.arn

  timeout = 60

  environment {
    variables = {
      NODE_OPTIONS = "--enable-source-maps"
      S3_BUCKET_NAME = aws_s3_bucket.lambda_bucket.id
      LOG_GROUP_NAMES = join(",",[for function in aws_lambda_function.hello_world : "/aws/lambda/${function.function_name}"])
    }
  }
}

resource "aws_cloudwatch_log_group" "extractor" {
  name = "/aws/lambda/extractor"

  retention_in_days = 1
}

resource "aws_iam_role" "lambda_extractor" {
  name = "serverless_lambda_extractor"

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
    name = "read_cw"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["cloudwatch:*", "logs:*", "s3:*"]
          Effect   = "Allow"
          Resource = "*"
        }
      ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy_extractor" {
  role       = aws_iam_role.lambda_extractor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

// ----------------------------------------------------------------------------------
// Coldstarts

data "archive_file" "coldstarts" {
  type = "zip"

  source_dir  = "${path.module}/../coldstarts"
  output_path = "${path.module}/../coldstarts.zip"
}

resource "aws_s3_bucket_object" "coldstarts" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "coldstarts.zip"
  source = data.archive_file.coldstarts.output_path
  etag   = filemd5(data.archive_file.coldstarts.output_path)
}

resource "aws_lambda_function" "coldstarts" {
  function_name = "coldstarts"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_bucket_object.coldstarts.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = data.archive_file.coldstarts.output_base64sha256

  role = aws_iam_role.lambda_coldstarts.arn

  timeout = 60

  environment {
    variables = {
      NODE_OPTIONS = "--enable-source-maps"
      S3_BUCKET_NAME = aws_s3_bucket.lambda_bucket.id
      FUNCTION_NAMES = join(",",[for function in aws_lambda_function.hello_world : "${function.function_name}"])
    }
  }
}

resource "aws_cloudwatch_log_group" "coldstarts" {
  name = "/aws/lambda/coldstarts"

  retention_in_days = 1
}

resource "aws_iam_role" "lambda_coldstarts" {
  name = "serverless_lambda_coldstarts"

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
    name = "read_cw"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["cloudwatch:*", "logs:*", "s3:*", "lambda:*", "kms:*"]
          Effect   = "Allow"
          Resource = "*"
        }
      ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy_coldstarts" {
  role       = aws_iam_role.lambda_coldstarts.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}