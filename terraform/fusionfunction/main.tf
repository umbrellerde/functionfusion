locals {
  function_names = toset([for file in fileset("${path.root}/../${var.use_case}/fusionables/**", "handler.js") : basename(dirname(file))])
  // See https://www.daveperrett.com/articles/2021/08/19/nested-for-each-with-terraform/
  // Use: for_each      = { for entry in local.memory_sizes_function_names: "${entry.function_name}.${entry.privilege}" => entry }
  // Use: each.value.
  __memory_sizes_function_names = distinct(flatten([
    for fname in local.function_names : [
      for size in var.memory_sizes : {
        function_name = fname
        memory_size = size
      }
    ]
  ]))
  memory_sizes_function_names = {for i, v in local.__memory_sizes_function_names:  i => v}
}

// Lambda Function
resource "aws_lambda_function" "fusion_function" {
  for_each      = local.memory_sizes_function_names
  function_name = "fusion-function-${each.value.function_name}-${each.value.memory_size}"

  s3_bucket = var.lambda_bucket.id
  s3_key    = var.lambda_fusion_manager.key

  runtime = "nodejs14.x"
  handler = "handler.handler"

  source_code_hash = var.source_code_archive.output_base64sha256

  role = var.lambda_exec.arn

  timeout = 60
  memory_size = each.value.memory_size

  environment {
    variables = {
      S3_BUCKET_NAME = var.lambda_bucket.id
      FUNCTION_TO_HANDLE = each.value.function_name
      MEMORY_SIZE = each.value.memory_size
      // THIS IS IMPORTANT: What should the initial fusion groups look like? Seperating it with a "." would put every task together
      //FUSION_GROUPS = join(",", [for fname in local.function_names: "${fname}"])
      // Initial Setup of Function Sizes: Give them the same size as the calling function initially
      FUSION_SETUPS = "TODO"
    }
  }
}

resource "aws_cloudwatch_log_group" "fusion_function" {
  for_each = local.memory_sizes_function_names
  name     = "/aws/lambda/${aws_lambda_function.fusion_function[each.key].function_name}"

  retention_in_days = 1
}

// API Gateway v1 for async invocations
resource "aws_api_gateway_resource" "sync_root_resource" {
  for_each    = local.memory_sizes_function_names
  path_part   = "SYNC-${each.value.function_name}-${each.value.memory_size}"
  parent_id   = var.api.root_resource_id
  rest_api_id = var.api.id
}

resource "aws_api_gateway_resource" "async_root_resource" {
  for_each    = local.memory_sizes_function_names
  path_part   = "${each.value.function_name}-${each.value.memory_size}"
  parent_id   = var.api.root_resource_id
  rest_api_id = var.api.id
}

resource "aws_lambda_permission" "lambda_permission" {
  for_each      = local.memory_sizes_function_names
  statement_id  = "AllowLambdaInvokeFromApigateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fusion_function[each.key].function_name
  principal     = "apigateway.amazonaws.com"

  # The /*/*/* part allows invocation from any stage, method and resource path
  # within API Gateway REST API.
  source_arn = "${var.api.execution_arn}/*/*/*"
}

resource "aws_api_gateway_method" "sync_proxy_root" {
  rest_api_id   = var.api.id
  resource_id   = var.api.root_resource_id
  http_method   = "POST"
  authorization = "NONE"
}


resource "aws_api_gateway_request_validator" "validator" {
  name        = "function-validator"
  rest_api_id = var.api.id
}

module "async_post_endpoint" {
  source                          = "github.com/vladcar/terraform-aws-serverless-common-api-gateway-method.git"
  for_each                        = local.memory_sizes_function_names
  http_method                     = "POST"
  integration_type                = "AWS"
  integration_http_method         = "POST"
  async_response_status_code      = "202"
  resource_path                   = aws_api_gateway_resource.async_root_resource[each.key].path_part
  resource_id                     = aws_api_gateway_resource.async_root_resource[each.key].id
  rest_api_id                     = var.api.id
  validator_id                    = aws_api_gateway_request_validator.validator.id
  lambda_invoke_arn               = aws_lambda_function.fusion_function[each.key].invoke_arn
  enable_async_lambda_integration = true
}

// Add the sync lambda manually since the module apparently only supports async invocation.
resource "aws_api_gateway_method" "sync_proxy" {
  for_each      = local.memory_sizes_function_names
  rest_api_id   = var.api.id
  resource_id   = aws_api_gateway_resource.sync_root_resource[each.key].id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sync_lambda" {
  for_each    = local.memory_sizes_function_names
  rest_api_id = var.api.id
  resource_id = aws_api_gateway_method.sync_proxy[each.key].resource_id
  http_method = aws_api_gateway_method.sync_proxy[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.fusion_function[each.key].invoke_arn
}

resource "aws_api_gateway_integration" "sync_lambda_root" {
  for_each                = local.memory_sizes_function_names
  rest_api_id             = var.api.id
  resource_id             = aws_api_gateway_method.sync_proxy_root.resource_id
  http_method             = aws_api_gateway_method.sync_proxy_root.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.fusion_function[each.key].invoke_arn
}
