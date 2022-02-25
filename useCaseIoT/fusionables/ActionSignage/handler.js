// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function (event, callFunction) {
    console.log('ActionSignage: Event: ', event);
    // {message: "Its below freezing!", location: event["sensorID"], chain: 1, duration: 10}


    let promises = []
    let val1 = parseInt(event["location"])
    let val2 = parseInt(event["location"]) + parseInt(event["chain"])

    let startLoc = Math.min(val1, val2)
    let endLoc = Math.max(val1, val2)

    console.log("Setting Sensor from", startLoc, "to", endLoc)

    for (let currId = startLoc; currId <= endLoc; currId++) {
        let params = {
            TableName: "UseCaseTable",
            Item : {
                'SensorID': {N: currId + ''},
                'Message': {S: JSON.stringify(event)}
            }
        }

        let response = ddb.putItem(params).promise()
        promises.push(response)
    }
    let answers = await Promise.all(promises) 
    return answers
}
