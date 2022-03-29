// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('CheckTemperature: Event: ', event);

    let sensorID = event["sensorID"]
    let chain = event["chain"]

    return {
        from: "CheckTemperature",
        actionSignage: await callFunction("ActionSignage", {location: sensorID, chain: chain}, false)
    }
}