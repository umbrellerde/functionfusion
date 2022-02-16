const AWS = require("aws-sdk");

AWS.config.update({region: process.env["AWS_REGION"]})

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();

const bucketName = process.env["S3_BUCKET_NAME"]
const functionNames = process.env["FUNCTION_NAMES"].split(",")

exports.handler = async function (event) {

    // Get all .json Files from S3 ==> All Existing Fusion Setups

    let newConfiguration = "A,B.C,D"

    console.log("Function names are", functionNames)
    console.log("Env is", process.env["FUNCTION_NAMES"])

    // Update the Env Variables of all Functions
    let promises = []
    // fname=fusion-function-A ==> Function to handle is part after last "-"
    for (let fname of functionNames) {
        let promise = lambda.updateFunctionConfiguration({
            FunctionName: fname,
            Environment: {
                Variables: {
                    'FUSION_GROUPS': newConfiguration,
                    'S3_BUCKET_NAME': bucketName,
                    'FUNCTION_TO_HANDLE': fname.split("-")[2]
                }
            }
        }).promise()
        promises.push(promise)
    }

    await Promise.all(promises)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: {bucketName: bucketName, logGroupNames: functionNames},
    }
}


/**
 * 
 * @param {string} bucket Bucket to get the file from
 * @param {string} key ~Filename of the file
 * @returns {Object|Array} The Parsed JSON
 */
async function getFromBucket(bucket, key) {

    // Check if the object exists
    let head;
    try {
        head = await s3.headObject({
            Bucket: bucket,
            Key: key
        }).promise()
    } catch (err) {
        console.log("HeadBucket Returned Error", err)
        return {}
    }

    console.log("Downloading Object, Head is", head)

    let resp = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise()

    console.log("Get Bucket got response", resp)

    let json = JSON.parse(resp.Body.toString('utf-8'))
    return json
}