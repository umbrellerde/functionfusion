#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
TERRAFORM_DIR="$SCRIPT_DIR/../../../terraform"
LOCAL_EXT_PATH="$SCRIPT_DIR/../../../tests/localExport.js"

read -p "Is awsume correctly set up? [Press any key to continue]"

##### Variables
# Terraform Use Case
use_case="useCases/split"
# Test name to identify different attempts
test_name="bursty_workload"
# Configuration File
# This is the finished configuration file - everything else will be handled by this script.
configm_file="configuration/$test_name/configurationMetadata.json"
# Note: remember to change optimization function in optimizer
# Folder Name Prefix for Results
folder_prefix="$test_name"
##### Variables

# Setup automatic extraction of configurations from provided configuration file
num_configs="$(jq ". | length" $configm_file)"
default_iterations="$num_configs"

echo "json found numer of configs: $num_configs"


cd "$TERRAFORM_DIR"
# Replace the S3 Bucket and all the Logs.
terraform destroy -auto-approve
sleep 12
terraform apply -auto-approve -var use_case="${use_case}"
# # The s3 bucket is not correctly created on the first try....
terraform apply -auto-approve -var use_case="${use_case}"
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

echo "Base URL is $base_url"
# Other Variable Setup
calc(){ awk "BEGIN { print "$*" }"; }
extract(){
    #aws lambda invoke --function-name extractor --payload '{"startTimeMs": "'$1'"}' /dev/null
    node "$LOCAL_EXT_PATH" "$s3_bucket" "$log_group_names" "$1"
}

use_case_name="$(basename $use_case)"
#Where to save results to, pretty long folder name but has all important information
results_folder="$SCRIPT_DIR/statistics/$folder_prefix-$default_iterations"

cd "$SCRIPT_DIR"
for ((iteration=0; iteration<default_iterations; iteration++)) do
    echo "Run $iteration"

    config_inner="$(jq ".[keys[${iteration}]]" $configm_file)"
    config_name="$(jq "keys[${iteration}]" $configm_file)"
    echo "{$config_name: $config_inner}" > tmp_config.json
    # Upload Configuration Metadata and Run Optideployer
    aws s3 cp "tmp_config.json" "s3://$s3_bucket/metadata/configurationMetadata.json"
    rm tmp_config.json
    sleep 5 # S3 consistency sleep
    aws lambda invoke --function-name optideployer --payload '{"test": "event"}' /dev/null
    sleep 20 # There are always some old functions called when the new fusion setup should be called...
    read -p "Please update memory size of k6 if necessary [press any key to continue]"

    start_time="$(calc $(date +"%s")*1000)"
    start_time="$(calc $start_time-240000)"
    echo "start time is $start_time"
    k6 run -e BASE_URL="$base_url" "k6/$test_name/1.js"
    end_time="$(calc $(date +"%s")*1000)"
    echo "end time is $end_time"
    sleep 5 # s3 consistency wait
    printf "\nDone\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
extract "1"

echo "Getting Results!"
mkdir -p $results_folder
aws s3 cp "s3://$s3_bucket/traces" "$results_folder" --recursive --exclude "*.zip"
#aws s3 cp "s3://$s3_bucket/metadata" "$results_folder/configuration" --recursive --exclude "*.zip"
