variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "bucket_name" {
  type    = string
  default = "fusion-code"
}

variable "use_case" {
  description = "The Name of the Folder where the function lives in"
  #default = "useCases/empty"
  default = "useCases/split"
}

variable "memory_sizes" {
  description = "List of all memory sizes that should be deployed. The first element of the list is the default, the rest of the order is irrelevant"
  default = [128, 256]
}