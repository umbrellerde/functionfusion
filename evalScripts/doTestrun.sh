#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/../terraform"

read -p "Is awsume correctly set up? [Press any key to continue]"

##### Variables
# How many Fusion Groups to try?
default_iterations=2
# How many invocations per fusion group?
default_count=200
# Where to send the Curl Request to
entry_task="A"
# Terraform Use Case
use_case="useCases/split"
# Requests per Second
req_s=5
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
sleep_time_s="$(calc 1/$req_s)"

use_case_name="$(basename $use_case)"
# Folder Name Prefix for Results
folder_prefix="$use_case_name-normal"
#Where to save results to, pretty long folder name but has all important information
results_folder="$SCRIPT_DIR/statistics/results/$folder_prefix-$entry_task-$default_iterations-x-$default_count-x-$req_s"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    echo "Run $iteration"
    start_time="$(calc $(date +"%s")*1000)"
    start_time="$(calc $start_time-240000)"
    echo "start time is $start_time"

    for ((run=0; run<default_count-1; run++)) do
        printf "...$run \n"
        # aws lambda invoke --function-name coldstarts /dev/null
        #curl -X POST "$base_url/$entry_task" -H 'Content-Type: application/json' -d '{"test": "event"}' &
        # Its sync so that the results are printed but it runs in a subshell so its not blocking
        (curl -X POST "$base_url/SYNC-$entry_task" -H 'Content-Type: application/json' -d '{"test": "event"}') &
        sleep $sleep_time_s
        # TODO get the right function size to call if default is not correct anymore... Maybe look into rewriting the optimzier to perform this operation.
    done
    # The last call should happen sync-ly so that we only continue when its finished
    echo "Last Sync Invocation"
    curl -X POST "$base_url/SYNC-$entry_task" -H 'Content-Type: application/json' -d '{"test": "event"}'
    printf "\nExtracting & Optimizing & Optideploying...\n"
    sleep 30 # cloudwatch consistency wait
    end_time="$(calc $(date +"%s")*1000)"
    echo "end time is $end_time"
    if [[ "$iteration" -eq 0 ]]; then
        echo "Cloudwatch never gets the first export correct. Doing some magic to make the export go smoothly";
        sleep 120
        aws lambda invoke --function-name extractor --payload '{"startTimeMs": "1"}' /dev/null
    else
        aws lambda invoke --function-name extractor --payload '{"startTimeMs": "'$start_time'"}' /dev/null
    fi
    sleep 5 # s3 consistency wait
    aws lambda invoke --function-name optimizer --payload '{"test": "event"}' /dev/null
    sleep 5 # s3 consistency wait
    aws lambda invoke --function-name optideployer --payload '{"test": "event"}' /dev/null
    printf "\nDone\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
aws lambda invoke --function-name extractor --payload '{"startTimeMs": "1"}'  /dev/null

echo "Getting Results!"
mkdir -p $results_folder
aws s3 cp "s3://$s3_bucket/traces" "$results_folder" --recursive --exclude "*.zip"
aws s3 cp "s3://$s3_bucket/metadata" "$results_folder/configuration" --recursive --exclude "*.zip"
