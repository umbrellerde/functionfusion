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
            timeout = timeout * 2
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
    let results = []
    // fname=fusion-function-A ==> Function to handle is part after last "-"
    let date = new Date()
    console.log("Updating Functions for Cold Starts...")
    for (let fname of functionLogGroupNames) {

        // Read Env of Functions
        let existing = await lambda.getFunction({
            FunctionName: fname
        }).promise()

        console.log("Existing is", existing)

        let existingVars = existing["Configuration"]["Environment"]["Variables"]

        existingVars["FORCE_COLD_START"] = date.toISOString()

        // Merge new FORCE_COLD_START variable
        console.log("Updating Function", fname)
        let promise = lambda.updateFunctionConfiguration({
            FunctionName: fname,
            Environment: {
                Variables: existingVars
            }
        }).promise()
        results.push(await promise)
    }
    return results
}