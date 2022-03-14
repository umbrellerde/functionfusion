#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR/terraform"
base_url="$(terraform output -raw base_url)"
s3_bucket="$(terraform output -raw lambda_bucket_name)"

default_count=10
default_iterations=15

echo "Base URL is $base_url"

start_date="$(date +%s)"
end_date=$((start_date + 60))
echo "Warming up from $start_date to $end_date"

curr_date="$(date +%s)"
while [ $curr_date -le $end_date ]; do
    curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}'
    sleep 1
    echo "."
    curr_date="$(date +%s)"
done

echo "-------------- Done Warming up, now for the optimizations ------------------"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    printf "\nRun $iteration"
    for ((run=0; run<default_count; run++)) do
        printf "\n...$run "
        curl -X POST "$base_url/A" -H 'Content-Type: application/json' -d '{"test": "event"}'
        sleep 1
    done
    sleep 5
    printf "\nExtracting...\n"
    aws lambda invoke --function-name extractor /dev/null
    printf "\nOptimizing...\n"
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
done

printf "Sleeping 20s to let CloudWatch catch up\n"
sleep 20
printf "\nExtracting...\n"
aws lambda invoke --function-name extractor /dev/null

echo "Getting Results!"
aws s3 cp "s3://$s3_bucket" "$SCRIPT_DIR/statistics/results" --recursive --exclude "*.zip"
