// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function (event, callFunction) {
    console.log("cartkvstorage", event)

    let operation = event.operation.toLowerCase()

    if (operation == "empty") { // TODO since there is now a range key...? 
        let resp = await ddb.deleteItem({
            Key: {
                "userId": {
                    S: event.userId
                }
            },
            TableName: "WebshopCartTable"
        }).promise()
        console.log("delete returned", resp)
        return resp
    } else if (operation == "get") {
        let resp = await ddb.query({
            TableName: "WebshopCartTable",
            KeyConditionExpression: "#sd = :sid",
            ExpressionAttributeNames: {
                "#sd": "userId"
            },
            ExpressionAttributeValues: {
                ":sid": { S: '' + event.userId }
            }
        }).promise()
        console.log("get returned", resp)
        // Expected Response
        // {
        //     "userId": "USER12",
        //     "items": [{
        //       "productId": "QWERTY",
        //       "quantity": 7
        //     }]
        //   }
        return resp.Items
    } else if (operation == "add") {
        let [itemId, quantity] = [event.itemId || 0, event.quantity || 0]
        let resp = await ddb.putItem({
            TableName: "WebshopCartTable",
            Item: {
                'userId': { S: event.userId.toString() },
                'itemId': { S: itemId.toString() },
                'quantity': { N: quantity }
            }
        }).promise()
        console.log("add returned", resp)
        return resp.Items

    }
}