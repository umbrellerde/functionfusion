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
  default = "useCases/IoT"
  # default = "useCases/split"
}