// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('CheckSoundAccident: Event: ', event);
    // {location: event["sensorID"], sieve: 100000}

    let times = 500_000
    try {
        times = parseInt(event["sieve"])
    } catch (err) {
        // Dont care, just use default
    }

    // TODO check cameras for slow cars
    let start = Date.now()
    let res = eratosthenes(times)
    let duration = Date.now() - start
    console.log("Took time:", duration, "For length", res.length)

    let params = {
        TableName: "UseCaseTable",
        Item : {
            'SensorID': {N: '1001'},
            'Message': {S: JSON.stringify(event)}
        }
    }

    return {
        from: "CheckSoundAccident",
        useCaseTable: await ddb.putItem(params).promise()
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

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

// function eratosthenes(limit) {
//     // See https://rosettacode.org/wiki/Sieve_of_Eratosthenes#JavaScript
//     var prms = [];
//     if (limit >= 2) prms = [2];
//     if (limit >= 3) {
//         var sqrtlmt = (Math.sqrt(limit) - 3) >> 1;
//         var lmt = (limit - 3) >> 1;
//         var bfsz = (lmt >> 5) + 1
//         var buf = [];
//         for (var i = 0; i < bfsz; i++)
//             buf.push(0);
//         for (var i = 0; i <= sqrtlmt; i++)
//             if ((buf[i >> 5] & (1 << (i & 31))) == 0) {
//                 var p = i + i + 3;
//                 for (var j = (p * p - 3) >> 1; j <= lmt; j += p)
//                     buf[j >> 5] |= 1 << (j & 31);
//             }
//         for (var i = 0; i <= lmt; i++)
//             if ((buf[i >> 5] & (1 << (i & 31))) == 0)
//                 prms.push(i + i + 3);
//     }
//     return prms;
// }