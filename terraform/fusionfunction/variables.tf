variable "use_case" {
  description = "The Name of the Folder where the function lives in"
  # default = "useCases/IoT"
  # default = "useCases/split"
}

// Memory Sizes
variable "memory_sizes" {
  description = "List of all memory sizes that should be deployed"
  default     = [128, 256, 512, 1024]
}

variable "lambda_bucket" {
  description = "Bucket where all the code and results are in"
  type = object({
    id = string
  })
}

variable "lambda_fusion_manager" {
  description = "S3 Bucket Object that should be deployed as function code"
  type = object({
    key = string
  })
}

variable "lambda_exec" {
  description = "IAM Role that the functions should assume"
  type = object({
    arn = string
  })
}

variable "api" {
  description = "aws_api_gateway_rest_api that should be used by all functions"
  type = object({
    root_resource_id = string
    id = string
    execution_arn = string
  })
  
}

variable "source_code_archive" {
  description = "data.archive_file that contains the function code"
  type = object({
    output_base64sha256 = string
  })
}