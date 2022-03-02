// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('SoundCheckTolerances: Event: ', event);

    let callingEvent = event["originalEvent"]

    // TODO check nearby microphones for comparable sound levels
    let params = {
        TableName: "UseCaseTable",
        KeyConditionExpression: "#sd = :sid",
        ExpressionAttributeNames:{
            "#sd": "SensorID"
        },
        ExpressionAttributeValues: {
            ":sid": {N: '' + (callingEvent["location"] + 1)}
        }
    }
    console.log("Querying with Params", params)
    let nextTemp = await ddb.query(params).promise()

    params = {
        TableName: "UseCaseTable",
        KeyConditionExpression: "#sd = :sid",
        ExpressionAttributeNames:{
            "#sd": "SensorID"
        },
        ExpressionAttributeValues: {
            ":sid": {N: (callingEvent["location"] - 1) + ''}
        }
    }
    console.log("Querying with Params", params)
    let beforeTemp = await ddb.query(params).promise()

    console.log("Doing some magic with nextTemp and beforeTemp", nextTemp, beforeTemp)
    let isTooLoud = Math.random() >= 0.4

    console.log("IsTooLoud:" , isTooLoud)

    if (isTooLoud) {
        // Set an Alert so that something can happen. I dont know, maybe a technichan would look at the site or whatever
        let params = {
            TableName: "UseCaseTable",
            Item : {
                'SensorID': {N: '1000'},
                'Message': {S: JSON.stringify(event)}
            }
        }
    
        return await ddb.putItem(params).promise()
    }
    return {}
}