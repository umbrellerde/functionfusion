#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/terraform"

# Enter MFA Token
read -p "Is awsume correctly set up? [Press any key to continue]"

# Replace the S3 Bucket and all the Logs.
terraform destroy -auto-approve
sleep 12
terraform apply -auto-approve
# Sometimes the s3 bucket is not correctly created on the first try....
terraform apply -auto-approve

sleep 12
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

# How many invocations per fusion group?
default_count=200 # 1000 in paper
# Note: remember to change optimization function in optimizer

echo "Base URL is $base_url"


for ((run=0; run<default_count; run++)) do
    printf "\n...$run "
    # curl -X POST "$base_url/SYNC-A" -H 'Content-Type: application/json' -d '{"test": "event"}'
    curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}' &
    sleep 1
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"


# Either run extractor in Lambda
#time="$(date +'%Y-%m-%dT%H:%M:%S%z')"
#aws lambda invoke --invocation-type Event --function-name extractor --payload '{"timeout": "18000000", "time": "'$time'"}'  /dev/null
#read -p "Is the extractor finished? (aws cli automatically retries...) [Press any key to continue]"
# Or Locally for the Cold Starts case where it would timeout in Lambda....
log_group_names="$(terraform output -raw function_log_group_names)"
cd "$SCRIPT_DIR/tests"
node extractLocally.js "$s3_bucket" "$log_group_names"

echo "Getting Results!"
aws s3 cp "s3://$s3_bucket/traces" "$SCRIPT_DIR/statistics/results" --recursive --exclude "*.zip"
