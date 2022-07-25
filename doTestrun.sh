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
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

# How many Fusion Groups to try?
default_iterations=7
# How many invocations per fusion group?
default_count=1000
# Note: remember to change optimization function in optimizer

echo "Base URL is $base_url"

# start_date="$(date +%s)"
# end_date=$((start_date + 60))
# echo "Warming up from $start_date to $end_date"

# curr_date="$(date +%s)"
# while [ $curr_date -le $end_date ]; do
#     curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}'
#     sleep 10
#     echo "."
#     curr_date="$(date +%s)"
# done

# echo "-------------- Done Warming up, now for the optimizations ------------------"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    printf "\nRun $iteration"
    for ((run=0; run<default_count; run++)) do
        printf "\n...$run "
        # aws lambda invoke --function-name coldstarts /dev/null
        #curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}' &
        curl -X POST "$base_url/SYNC-I" -H 'Content-Type: application/json' -d '{"test": "event"}' &
        sleep 1
    done
    printf "\nExtracting & Optimizing...\n"
    #(aws lambda invoke --function-name extractor /dev/null && aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null) &
    sleep 10
    aws lambda invoke --function-name extractor --payload '{"timeout": "500000"}' /dev/null
    sleep 3
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
    printf "\nDone...\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
aws lambda invoke --function-name extractor --payload '{"timeout": "14400000 ms"}'  /dev/null

echo "Getting Results!"
aws s3 cp "s3://$s3_bucket/traces" "$SCRIPT_DIR/statistics/results" --recursive --exclude "*.zip"

# aws s3 cp "s3://(terraform output -raw lambda_bucket_name)" "./statistics/results" --recursive --exclude "*.zip"
