output "lambda_bucket_name" {
  description = "S3 Bucket used to store function code"

  value = aws_s3_bucket.lambda_bucket.id
}

output "function_name" {
  // for_each = fileset("${path.module}/../fusionables", "**/handler.json")
  description = "Lambda functions"

  value = [
    for function in aws_lambda_function.hello_world : function.arn
  ]
}

# output "base_urls" {
#   description = "Base URL Gateway Stage"

#   value = aws_apigatewayv2_stage.lambda.invoke_url
# }

output "lambda_urls" {
  description = "All the URLs where the functions can be found"

  value = [
    for function in aws_api_gateway_resource.sync_root_resource : function.path
  ]
}

output "base_url" {
  description = "Base URL of API GW"

  value = aws_api_gateway_stage.stage.invoke_url
}
