output "lambda_bucket_name" {
  description = "S3 Bucket used to store function code"

  value = aws_s3_bucket.lambda_bucket.id
}

output "function_name" {
  // for_each = fileset("${path.module}/../fusionables", "**/handler.json")
  description = "Lambda functions"

  value = [
    for function in module.fusionfunction.function : function.arn
  ]
}

# output "base_urls" {
#   description = "Base URL Gateway Stage"

#   value = aws_apigatewayv2_stage.lambda.invoke_url
# }

output "lambda_urls_sync" {
  description = "All the URLs where the sync functions can be found"

  value = module.fusionfunction.sync_paths
}

output "lambda_urls_async" {
  description = "All the URLs where the async functions can be found"

  value = module.fusionfunction.async_paths
}

output "base_url" {
  description = "Base URL of API GW"

  value = aws_api_gateway_stage.stage.invoke_url
}
