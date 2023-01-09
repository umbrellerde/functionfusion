async function main() {
    process.env["AWS_REGION"] = "eu-central-1"
    process.env["S3_BUCKET_NAME"] = process.argv[2] || "fusion-code-hideously-suddenly-dashing-snail"
    process.env["FUNCTION_NAMES"] = process.argv[3] || "A,B,C,D,E,F,G"
    process.env["CONFIGURATION_METADATA"] = "metadata/configurationMetadata.json"
    process.env["FUNCTION_POSSIBLE_MEM_SIZES"] = process.argv[4] || "128,256,512"
    let exporter = require("../managers/optimizer/handler")
    
    let optimized = await exporter.handler()

    console.log(optimized)

}

main()