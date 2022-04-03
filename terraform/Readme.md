`terraform init` once

`terraform apply -auto-approve`

to test: `curl -X POST https://[baseUrlFromTerraform].execute-api.eu-central-1.amazonaws.com/onlyStage/SYNC-A -H 'Content-Type: application/json' -d '{"sync": true}'`

`terraform destroy -auto-approve`

# How to run a full benchmark
variables.tf: Choose folder

extractor/handler: Set Minutes to check for logs
optimizer/handler: Set Optimization Algo: Median / iterate / ...

doTestrun.sh: Change two variables: amount and numFusionGroups