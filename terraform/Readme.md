`terraform init` once

`terraform apply`

`curl "$(terraform output -raw base_url)/hello?Name=Test123"`

or in fish: `curl (terraform output -raw base_url)"/hello?Name=Test123"`

`terraform destroy`

## Overview

1. Deploy the Optimizer / Deployer function to AWS + Gateway Access. It knows where to find the fusion setup (bucket? Db?).

2. Optimizer Deploys all the functions in their own lambda. Writes everything it has created into S3 for easier destruction.

3. Optimizer runs all 15mins to check logs, put aggregated info into s3, calculate new setup to test.

4. Takedown Script: Delete all objects created by functions, then terraform destroy

----

1. Create one Deployment with the same Code for every fusionable. Create an initial deployment of smallest functions possible.

2. Set Env Variables OR S3 Bucket information or whatever with information on what to do in every function

3. Function Handler checks what it is, then invokes locally by importing `require('fusionable/${function}')` or remotely by using the configuration file

3. Optimizer checks logs and decides what to do next --> Rewrites S3 Information or ...

4. Two Trees: One that holds the order of operations, one that holds the functionARN in which this function should currently be run.