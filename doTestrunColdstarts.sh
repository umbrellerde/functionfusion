#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/terraform"

# Enter MFA Token
read -p "Is awsume correctly set up?"

# Replace the S3 Bucket and all the Logs.
terraform destroy -auto-approve --parallelism=4
sleep 12
terraform apply -auto-approve --parallelism=4
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

default_count=20
default_iterations=13

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
        aws lambda invoke --function-name coldstarts /dev/null
        curl -X POST "$base_url/SYNC-A" -H 'Content-Type: application/json' -d '{"test": "event"}'
        sleep 5
    done
    printf "\nExtracting & Optimizing & Coldifying...\n"
    #(aws lambda invoke --function-name extractor /dev/null && aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null) &
    #sleep 5
    awsume trever
    aws lambda invoke --function-name extractor /dev/null
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
    printf "\nDone...\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
awsume trever
aws lambda invoke --function-name extractor /dev/null

echo "Getting Results!"
aws s3 cp "s3://$s3_bucket" "$SCRIPT_DIR/statistics/results" --recursive --exclude "*.zip"

# aws s3 cp "s3://(terraform output -raw lambda_bucket_name)" "./statistics/results" --recursive --exclude "*.zip"
