// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('CheckAir: Event: ', event);

    let sensorID = event["originalEvent"]["sensorID"]
    let chain = 5

    let res = await callFunction("DetectJam", event, true)
    console.log("Got Response from DetectJam: ", res)

    console.log("CheckAir is calling Signage async")
    return {
        from: "CheckAir",
        actionSignage: await callFunction("ActionSignage", {location: sensorID, chain: chain}, false)
    }
}