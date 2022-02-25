// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('ActionTrafficReroute: Event: ', event);
    // {location: event["sensorID"], duration: 10}

    let promises = []

    let startLoc = parseInt(event["location"])
    let endLoc = startLoc - 4

    console.log("Setting Message Board", startLoc, "to", endLoc)

    for (let i = startLoc; i >= endLoc; i--) {
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
               
    return {}
}
