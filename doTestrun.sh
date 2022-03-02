#!/usr/bin/env bash
base_url="$(cd terraform/ && terraform output -raw base_url)"
default_count=20
default_iterations=10

echo "Base URL is $base_url"

for ((iteration=0; iteration<default_iterations; iteration++)) do
    printf "\nRun $iteration"
    for ((run=0; run<default_count; run++)) do
        printf "\n...$run "
        curl -X POST "$base_url/SYNC-AnalyzeSensor" -H 'Content-Type: application/json' -d '{"test": "event"}'
    done
    sleep 5
    printf "\nExtracting...\n"
    aws lambda invoke --function-name extractor /dev/null
    printf "\nOptimizing...\n"
    aws lambda invoke --function-name optimizer /dev/null
done