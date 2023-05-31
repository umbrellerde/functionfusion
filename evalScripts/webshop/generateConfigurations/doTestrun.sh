#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
TERRAFORM_DIR="$SCRIPT_DIR/../../../terraform"
LOCAL_EXT_PATH="$SCRIPT_DIR/../../../tests/localExport.js"

read -p "Is awsume correctly set up? [Press any key to continue]"

##### Variables
# How many iterations?
default_iterations=4 # 16 should be enough? Calculated are 13 sync calls to merge, +2?? to test sizes, +1 optimal is used. Otherwise re-run with partly configured configurationmetadata.json....
# How long per iteration? In seconds
duration=111 # 111 for enough root invocations, but I have already used up too many invocations, so lets ramp it down a little bit
# Terraform Use Case
use_case="useCases/webshop"
# Requests per Second
req_s=3 # 3, but every request creates three invocations (+5 at the beginning)
# Test name to identify different attempts
test_name="fixedcheckout"
# Note: remember to change optimization function in optimizer
entry_task="m"
##### Variables


cd "$TERRAFORM_DIR"
# Replace the S3 Bucket and all the Logs.
#terraform destroy -auto-approve # TODO re-insert Terraform here!!!
#sleep 12
#terraform apply -auto-approve -var use_case="${use_case}"
# The s3 bucket is not correctly created on the first try....
#terraform apply -auto-approve -var use_case="${use_case}"
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"
log_group_names="$(terraform output -raw function_log_group_names)"

echo "Base URL is $base_url"
# Other Variable Setup
calc(){ awk "BEGIN { print "$*" }"; }
extract(){
    #aws lambda invoke --function-name extractor --payload '{"startTimeMs": "'$1'"}' /dev/null
    node "$LOCAL_EXT_PATH" "$s3_bucket" "$log_group_names" "$1"
}

# Folder Name Prefix for Results
folder_prefix="$test_name"
#Where to save results to, pretty long folder name but has all important information
results_folder="$SCRIPT_DIR/statistics/$folder_prefix-$entry_task-$default_iterations-x-$duration-x-$req_s"

cd "$SCRIPT_DIR"
for ((iteration=0; iteration<default_iterations; iteration++)) do
    echo "Run $iteration"
    aws lambda invoke --function-name optideployer --payload '{"test": "event"}' /dev/null

    #if [[ "$iteration" -gt 7 ]]; then
        read -p "Please check if you need to modify the load generator to a new memory size...."
    #fi

    start_time="$(calc $(date +"%s")*1000)"
    start_time="$(calc $start_time-240000)"
    echo "start time is $start_time"

    k6 run -e BASE_URL="$base_url" -e RPS="$req_s" -e DURATION="$duration" "k6/1.js"
    printf "\nExtracting & Optimizing & Optideploying...\n"
    sleep 30 # cloudwatch consistency wait
    end_time="$(calc $(date +"%s")*1000)"
    echo "end time is $end_time"
    if [[ "$iteration" -eq 0 ]]; then
        echo "Cloudwatch never gets the first export correct. Doing some magic to make the export go smoothly";
        sleep 90
        extract "1"
    else
        extract "$start_time"
    fi
    sleep 5 # s3 consistency wait
    aws lambda invoke --function-name optimizer --payload '{"test": "event"}' /dev/null
    sleep 5 # s3 consistency wait
    printf "\nDone\n"
    if [[ iteration -gt default_iterations-2 ]]; then
        echo "Please check if the Optimizer is finally finished. And check if Input Function memory sizes need to be adjusted in k6"
        read -p "This is the last run according to the optimizer. Please set a new value for default_iterations if you want to continue anyway (Must be at least one bigger than current iteration to continue). Current Iteration = $iteration, Default Iterations = $default_iterations:" default_iterations
    fi
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
extract "1"

echo "Getting Results!"
echo "Please don't forget to delete the last configuration as it should be empty...."
mkdir -p $results_folder
aws s3 cp "s3://$s3_bucket/traces" "$results_folder" --recursive --exclude "*.zip"
aws s3 cp "s3://$s3_bucket/metadata" "$results_folder/configuration" --recursive --exclude "*.zip"
