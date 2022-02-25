// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('MarkSensorBroken: Event: ', event);

    //let sensorID = event["sensorID"]

    let params = {
        TableName: "UseCaseTable",
        Item : {
            'SensorID': {N: '1000'},
            'Message': {S: JSON.stringify(event)}
        }
    }

    return await ddb.putItem(params).promise()
}