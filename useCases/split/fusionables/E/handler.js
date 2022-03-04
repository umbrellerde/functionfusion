// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function (event, callFunction) {
    console.log("Event for E:", event)
    let calls = []
    let checked = []

    // eratosthenes(500_000)
    // checked.push(await callFunction("CheckSensor", { test: "event" }, true))
    // calls.push(callFunction("ActionSignage", { test: "event" }, false))
    let results = await Promise.all(calls)

    await new Promise(resolve => setTimeout(resolve, 800))

    console.log("Results are", results)
    console.log("Checked are", checked)
    return {
        results: results,
        checked: checked
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