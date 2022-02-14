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
          Action   = ["cloudwatch:*", "logs:*"]
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
