module "optimizer" {
  source = "./managers"
  manager_name = "optimizer"
  timeout = 60
  memory_size = 512
  lambda_bucket = aws_s3_bucket.lambda_bucket
}

module "extractor" {
  source = "./managers"
  manager_name = "extractor"
  timeout = 900
  memory_size = 1024
  lambda_bucket = aws_s3_bucket.lambda_bucket
  env = {
    LOG_GROUP_NAMES = join(",",[for function_name in module.fusionfunction.function_names : "/aws/lambda/${function_name}"])
  }
}

module "coldstarts" {
  source = "./managers"
  manager_name = "coldstarts"
  lambda_bucket = aws_s3_bucket.lambda_bucket
}