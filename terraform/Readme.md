`terraform init` once

`terraform apply`

`curl "$(terraform output -raw base_url)/hello?Name=Test123"`

or in fish: `curl (terraform output -raw base_url)"/hello?Name=Test123"`

`terraform destroy`