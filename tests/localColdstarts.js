async function main() {
    process.env["AWS_REGION"] = "eu-central-1"
    process.env["S3_BUCKET_NAME"] = process.argv[2] || "fusion-code-hideously-suddenly-dashing-snail"
    process.env["FUNCTION_NAMES"] = process.argv[3] || "A,B,C,D,E,F,G"
    let exporter = require("../managers/coldstarts/handler")
    
    let optimized = await exporter.handler()

    console.log(optimized)

}

main()