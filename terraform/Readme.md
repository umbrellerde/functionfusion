# TL;DR

`terraform init` once

to deploy: `terraform apply -auto-approve`

to test: `curl -X POST https://[baseUrlFromTerraform].execute-api.eu-central-1.amazonaws.com/onlyStage/SYNC-A -H 'Content-Type: application/json' -d '{"sync": true}'`

to destroy: `terraform destroy -auto-approve`

# How to run a full benchmark
1. In the file `variables.tf`: Choose the folder that contains all functions. (`useCases/IoT` or `useCases/split`)
2. Change the file `extractor/handler.js` to set the timeout to check for function logs (i.e., the maximum time between optimizer runs)
3. Change the file `optimizer/handler` to choose the algo you want to use
4. Modify the variables `default_iterations` and `default_count` of the run script (`doTestrun.sh` or `doTestrunColdstarts.sh`, depending on your use case)
5. Also modify the API Gateway Endpoint that is called. Calls to `$entrypointName` are async, calls to `SYNC-$entrypointName` are sync.
6. If you run the benchmark for the first time, run `terraform init` inside `terraform/` to set up terraform and make sure that you aws-cli has all the rights it needs. (I use https://awsu.me/ for this task)
7. Done! Now start the run script. When it is done, it will copy the resulting `.json` files into `statistics/results/` (Make sure to move files from old tests into another directory there)
8. Use the statistics notebook `statistics/stats.ipynb` to generate the graphs. The graphs used in the paper were generated using `statistics/finalstats.ipynb`
9. Run `terraform destroy` inside `terraform/` to destroy all cloud resources.

## Debugging
1. Read the cloudwatch logs of the corresponding function
2. If the extractor times out or whatever, you can use `node tests/extracLocally.js` as a last resort to run the extractor on your machine.
3. Make sure that you have no other API Gateways deployed in your account. The fusion handler sends all its requests to other fusion groups to the first API Gateway Endpoint it can find