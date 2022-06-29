module "optimizer" {
  source = "./managerfunction"
  manager_name = "optimizer"
  timeout = 60
  memory_size = 512
  lambda_bucket = aws_s3_bucket.lambda_bucket
  function_names = module.fusionfunction.function_names
  env = {
    CONFIGURATION_METADATA = module.fusionfunction.configuration_metadata.key
  }
}

module "extractor" {
  source = "./managerfunction"
  manager_name = "extractor"
  timeout = 900
  memory_size = 1024
  lambda_bucket = aws_s3_bucket.lambda_bucket
  env = {
    LOG_GROUP_NAMES = join(",",[for function_name in module.fusionfunction.function_names : "/aws/lambda/${function_name}"])
  }
  function_names = module.fusionfunction.function_names
}

module "coldstarts" {
  source = "./managerfunction"
  manager_name = "coldstarts"
  lambda_bucket = aws_s3_bucket.lambda_bucket
  function_names = module.fusionfunction.function_names
}

module "optideployer" {
  source = "./managerfunction"
  manager_name = "optideployer"
  lambda_bucket = aws_s3_bucket.lambda_bucket
  function_names = module.fusionfunction.function_names
  env = {
    FUNCTION_ZIP_OBJECT = module.fusionfunction.lambda_fusion_manager.key
  }
}