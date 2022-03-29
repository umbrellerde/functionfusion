// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('StoreEvent: Event: ', event);
    // {location: event["sensorID"], duration: 10}

    let params = {
        TableName: "SensorDataTable",
        Item : {
            'SensorID': {N: event["sensorID"] + ''},
            'Message': {S: JSON.stringify(event)}
        }
    }
    return await ddb.putItem(params).promise()
}
