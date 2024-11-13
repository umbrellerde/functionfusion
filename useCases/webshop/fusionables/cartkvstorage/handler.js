// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function (event, callFunction) {
    console.log("cartkvstorage", event)

    let operation = event.operation.toLowerCase()

    if (operation == "empty") { // TODO since there is now a range key...?
        let current = await ddb.query({
            TableName: "WebshopCartTable",
            KeyConditionExpression: "#sd = :sid",
            ExpressionAttributeNames: {
                "#sd": "userId"
            },
            ExpressionAttributeValues: {
                ":sid": { S: '' + event.userId }
            }
        }).promise()
        current = current.Items.map(item => item.itemId.S)
        await Promise.all(current.map(async item => {
            let resp = await ddb.deleteItem({
                Key: {
                    "userId": {
                        S: event.userId
                    },
                    "itemId": {
                        S: item
                    }
                },
                TableName: "WebshopCartTable"
            }).promise()
            return {}
        }));

        return {}
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
        // Expected Response
        // {
        //     "userId": "USER12",
        //     "items": [{
        //       "productId": "",
        //       "quantity": 7
        //     }]
        //   }
        return resp.Items
    } else if (operation == "add") {
        let [productId, quantity] = [event.productId || "2", event.quantity || 2]
        let resp = await ddb.putItem({
            TableName: "WebshopCartTable",
            Item: {
                'userId': { S: event.userId.toString() },
                'itemId': { S: productId.toString() },
                'quantity': { N: quantity.toString() }
            }
        }).promise()
        eratosthenes(500_000)
        return resp.Items

    }
}

function eratosthenes(limit) {
    var primes = [];
    if (limit >= 2) {
        var sqrtlmt = Math.sqrt(limit) - 2;
        var nums = new Array(); // start with an empty Array...
        for (var i = 2; i <= limit; i++) // and
            nums.push(i); // only initialize the Array once...
        for (var i = 0; i <= sqrtlmt; i++) {
            var p = nums[i]
            if (p)
                for (var j = p * p - 2; j < nums.length; j += p)
                    nums[j] = 0;
        }
        for (var i = 0; i < nums.length; i++) {
            var p = nums[i];
            if (p)
                primes.push(p);
        }
    }
    return primes;
}