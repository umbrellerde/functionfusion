output "lambda_bucket_name" {
  description = "S3 Bucket used to store function code"

  value = aws_s3_bucket.lambda_bucket.id
}

output "function_name" {
  description = "Lambda function"

  value = aws_lambda_function.hello_world.function_name
}

output "base_url" {
  description = "Base URL Gateway Stage"

  value = aws_apigatewayv2_stage.lambda.invoke_url
}
