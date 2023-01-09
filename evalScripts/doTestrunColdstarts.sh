#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/terraform"

read -p "Is awsume correctly set up? [Press any key to continue]"

##### Variables
# How many Fusion Groups to try?
default_iterations=2
# How many invocations per fusion group?
default_count=5
# Where to send the Curl Request to
entry_task="A"
# Terraform Use Case
use_case="useCases/split"
# Note: remember to change optimization function in optimizer
##### Variables

# Replace the S3 Bucket and all the Logs.
terraform destroy -auto-approve
sleep 12
terraform apply -auto-approve -var use_case="${use_case}"
# The s3 bucket is not correctly created on the first try....
terraform apply -auto-approve -var use_case="${use_case}"
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

echo "Base URL is $base_url"
# Other Variable Setup
calc(){ awk "BEGIN { print "$*" }"; }


use_case_name="$(basename $use_case)"
# Folder Name Prefix for Results
folder_prefix="$use_case_name-normal"
#Where to save results to, pretty long folder name but has all important information
results_folder="$SCRIPT_DIR/statistics/results/$folder_prefix-$entry_task-$default_iterations-x-$default_count-x-$req_s"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    printf "\nRun $iteration"
    start_time="$(calc $(date +"%s")*1000)"
    for ((run=0; run<default_count; run++)) do
        printf "\n...$run "
        aws lambda invoke --function-name coldstarts /dev/null
        #curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}' &
        curl -X POST "$base_url/SYNC-$entry_task" -H 'Content-Type: application/json' -d '{"test": "event"}'
    done
    printf "\nExtracting & Optimizing & Optideploying...\n"
    sleep 20
    end_time="$(calc $(date +"%s")*1000)"
    timeout_ms_extractor="$(calc $end_time-$start_time+15000)"
    aws lambda invoke --function-name extractor --payload '{"startTimeMs": "'$start_time'"}' /dev/null
    sleep 3
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
    sleep 3
    aws lambda invoke --function-name optideployer --payload '{"test": "event"}' /dev/null
    printf "\nDone\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
aws lambda invoke --function-name extractor --payload '{"timeout": "14400000"}'  /dev/null

echo "Getting Results!"
mkdir -p $results_folder
aws s3 cp "s3://$s3_bucket/traces" "$results_folder" --recursive --exclude "*.zip"