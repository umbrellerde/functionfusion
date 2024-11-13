// URLs
output "function_names" {
    value = [ for function in aws_lambda_function.fusion_function : function.function_name
    ]
}

output "function" {
    value = [ for function in aws_lambda_function.fusion_function : function
    ]
}

output "configuration_metadata" {
    value = aws_s3_object.configuration_metadata
}

output "memory_sizes" {
    value = var.memory_sizes
}

output "lambda_fusion_manager" {
    description = "Bucket Object that has been deployed as function code"
    value = aws_s3_object.lambda_fusion_manager
}

output "default_fusion_setup" {
    value = local.default_fusion_setup
}

output "sync_paths" {
    value = [for path in aws_api_gateway_resource.sync_root_resource: path.path]
}

output "async_paths" {
    value = [for path in aws_api_gateway_resource.async_root_resource: path.path]
}

output "default_sync_paths" {
    value = [for path in aws_api_gateway_resource.default_sync_root_resource: path.path]
}

output "default_async_paths" {
    value = [for path in aws_api_gateway_resource.default_async_root_resource: path.path]
}


output "debug_names" {
  value = local.memory_sizes_function_names
}

output "debug_keys" {
    value = local.default_function_keys
}

output "debug_file" {
    value = local_file.lambda_default_fusion_setup_json.content
}