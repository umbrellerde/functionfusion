const AWS = require("aws-sdk");

AWS.config.update({ region: process.env["AWS_REGION"] })

const lambda = new AWS.Lambda();
const functionLogGroupNames = process.env["FUNCTION_NAMES"].split(",")

// Force a cold start by changing an environment variable
exports.handler = async function (event) {

    let results = null
    let run = 0
    let timeout = 1000
    while (true) {
        try {
            results = await createColdStarts()
        } catch (err) {
            console.log("Error is:", err)
            await new Promise(resolve => setTimeout(resolve, timeout))
            run++
            timeout = timeout * 1.5
        }
        if (results != null) {
            break;
        }
        if (run > 10) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: { error: "Was not able to coldstart within 10 tries" },
            }
        }
    }
    console.log("Done!", results)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { results: results },
    }
}

async function createColdStarts() {
    // Update the Env Variables of all Functions
    let promises = []
    // fname=fusion-function-A ==> Function to handle is part after last "-"
    let date = new Date()
    console.log("Updating Functions for Cold Starts...")
    for (let fname of functionLogGroupNames) {
        let promise = lambda.updateFunctionConfiguration({
            FunctionName: fname,
            Environment: {
                Variables: {
                    'FORCE_COLD_START': date.toISOString()
                }
            }
        }).promise()
        promises.push(promise)
    }

    let results = await Promise.all(promises)
}