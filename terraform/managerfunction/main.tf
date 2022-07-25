data "archive_file" "zip" {
  type = "zip"

  source_dir  = "${path.root}/../managers/${var.manager_name}"
  output_path = "${path.root}/deployment_artifacts/${var.manager_name}.zip"
}

resource "aws_s3_object" "object" {
  bucket = var.lambda_bucket.id
  key    = "originalCode/${var.manager_name}.zip"
  source = data.archive_file.zip.output_path
  etag   = filemd5(data.archive_file.zip.output_path)
}

resource "aws_lambda_function" "manager_function" {
  function_name = var.manager_name

  s3_bucket = var.lambda_bucket.id
  s3_key    = aws_s3_object.object.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = data.archive_file.zip.output_base64sha256

  role = aws_iam_role.iam_role.arn

  timeout = var.timeout
  memory_size = var.memory_size

  environment {
    variables = merge({
      S3_BUCKET_NAME = var.lambda_bucket.id
      FUNCTION_NAMES = join(",",[for function_name in var.function_names : "${function_name}"])
    }, var.env)
  }
}

// Don't retry calling this function! I want to know about timeouts
resource "aws_lambda_function_event_invoke_config" "example" {
  function_name                = aws_lambda_function.manager_function.function_name
  maximum_retry_attempts       = 0
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/aws/lambda/${var.manager_name}"

  retention_in_days = 1
}

resource "aws_iam_role" "iam_role" {
  name = "serverless_lambda_${var.manager_name}"

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

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.iam_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}