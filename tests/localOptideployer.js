async function main() {
    process.env["AWS_REGION"] = "eu-central-1"
    process.env["S3_BUCKET_NAME"] = process.argv[2] || "fusion-code-hideously-suddenly-dashing-snail"
    process.env["LOG_GROUP_NAMES"] = process.argv[3] || "/aws/lambda/fusion-function-A-128,/aws/lambda/fusion-function-A-256,/aws/lambda/fusion-function-F-128,/aws/lambda/fusion-function-F-256,/aws/lambda/fusion-function-G-128,/aws/lambda/fusion-function-G-256,/aws/lambda/fusion-function-B-128,/aws/lambda/fusion-function-B-256,/aws/lambda/fusion-function-C-128,/aws/lambda/fusion-function-C-256,/aws/lambda/fusion-function-D-128,/aws/lambda/fusion-function-D-256,/aws/lambda/fusion-function-E-128,/aws/lambda/fusion-function-E-256"

    process.env["FUNCTION_ZIP_OBJECT"] = "originalCode/function.zip"
    process.env["CONFIGURATION_METADATA"] = "metadata/configurationMetadata.json"

    let exporter = require("../managers/optideployer/handler")
    
    let optimized = await exporter.handler()

    console.log(optimized)

}

main()