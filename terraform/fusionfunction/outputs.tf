// URLs
output "function_names" {
    value = [ for function in aws_lambda_function.fusion_function : function.function_name
    ]
}

output "function" {
    value = [ for function in aws_lambda_function.fusion_function : function
    ]
}

output "sync_paths" {
    value = [for path in aws_api_gateway_resource.sync_root_resource: path.path]
}

output "async_paths" {
    value = [for path in aws_api_gateway_resource.async_root_resource: path.path]
}