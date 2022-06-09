variable "manager_name" {
  type = string
  description = "Name of the folder that should be uploaded, which will be the function name and the name of the zip file"
}

variable "timeout" {
  type = number
  description = "Timeout of function in seconds"
  default = 60
}

variable "memory_size" {
  type = number
  description = "How much memory in MB should the function have"
  default = 128
}

varable "lambda_bucket" {
    type = object({
        id = string
    })
    description = "The S3 Bucket that is used everywhere"
}

variable "env" {
  type = map
  description = "Other Env Variables that should be added to Env"
}