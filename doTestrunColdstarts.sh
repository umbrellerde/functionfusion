#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/terraform"

set -e 
set -o pipefail

# Enter MFA Token
read -p "Is awsume correctly set up?"

# Replace the S3 Bucket and all the Logs.
terraform destroy -auto-approve --parallelism=8
sleep 10
terraform apply -auto-approve --parallelism=8
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

# Number of Fusion Groups
default_iterations=6
# Number of Iterations per Fusion Group
default_count=300


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
        #curl -X POST "$base_url/SYNC-I" -H 'Content-Type: application/json' -d '{"test": "event"}'
    done
    printf "\nExtracting & Optimizing & Coldifying...\n"
    #(aws lambda invoke --function-name extractor /dev/null && aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null) &
    sleep 15
    echo "Extracting"
    aws lambda invoke --function-name extractor --payload '{"timeout": "750000"}' /dev/null
    echo "Optimizing"
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
    printf "\nDone...\n"
done

printf "Sleeping 30s to let CloudWatch catch up\n"
sleep 30
printf "\nExtracting...\n"
aws lambda invoke --function-name extractor --payload '{"timeout": "15840000"}' /dev/null

echo "Getting Results!"
echo "Bucket is: $s3_bucket"
echo "Copy command is aws s3 cp s3://$s3_bucket $SCRIPT_DIR/statistics/results --recursive --exclude *.zip"
aws s3 cp "s3://$s3_bucket" "$SCRIPT_DIR/statistics/results" --recursive --exclude "*.zip"

# aws s3 cp "s3://(terraform output -raw lambda_bucket_name)" "./statistics/results" --recursive --exclude "*.zip"
