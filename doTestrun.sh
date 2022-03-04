#!/usr/bin/env bash
base_url="$(cd terraform/ && terraform output -raw base_url)"
default_count=15
default_iterations=10

echo "Base URL is $base_url"

start_date="$(date +%s)"
end_date=$((start_date + 30))
echo "Warming up for 0.5mins, from $start_date to $end_date"

curr_date="$(date +%s)"
while [ $curr_date -le $end_date ]; do
    curl -X POST "$base_url/SYNC-A" -H 'Content-Type: application/json' -d '{"test": "event"}'
    sleep 1
    echo ""
    curr_date="$(date +%s)"
done

echo "-------------- Done Warming up, now for the optimizations ------------------"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    printf "\nRun $iteration"
    for ((run=0; run<default_count; run++)) do
        printf "\n...$run "
        curl -X POST "$base_url/SYNC-A" -H 'Content-Type: application/json' -d '{"test": "event"}'
        sleep 1
    done
    sleep 5
    printf "\nExtracting...\n"
    aws lambda invoke --function-name extractor /dev/null
    printf "\nOptimizing...\n"
    aws lambda invoke --function-name optimizer --payload '{"deleteSeconds": 0}' /dev/null
done

#printf "\nExtracting...\n"
#aws lambda invoke --function-name extractor /dev/null