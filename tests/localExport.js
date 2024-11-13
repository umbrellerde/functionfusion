async function main() {
    process.env["AWS_REGION"] = "eu-central-1"
    process.env["S3_BUCKET_NAME"] = process.argv[2] || "fusion-code-secondly-usually-humane-serval"
    process.env["LOG_GROUP_NAMES"] = process.argv[3] || "/aws/lambda/fusion-function-AS-128,/aws/lambda/fusion-function-AS-1650,/aws/lambda/fusion-function-CT-128,/aws/lambda/fusion-function-CT-1650,/aws/lambda/fusion-function-CW-128,/aws/lambda/fusion-function-CW-1650,/aws/lambda/fusion-function-DJ-128,/aws/lambda/fusion-function-DJ-1650,/aws/lambda/fusion-function-I-128,/aws/lambda/fusion-function-I-1650,/aws/lambda/fusion-function-SE-128,/aws/lambda/fusion-function-SE-1650,/aws/lambda/fusion-function-CA-128,/aws/lambda/fusion-function-CA-1650,/aws/lambda/fusion-function-CS-128,/aws/lambda/fusion-function-CS-1650,/aws/lambda/fusion-function-CSA-128,/aws/lambda/fusion-function-CSA-1650,/aws/lambda/fusion-function-CSL-128,/aws/lambda/fusion-function-CSL-1650"
    //let exporter = await import("../managers/extractor/handler")
    let exporter = require("../managers/extractor/handler")

    console.log("Local Export starting.")
    await exporter.handler({startTimeMs: process.argv[4] || 0})
    console.log("Local Export is done.")


}

main()