// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });


const { Worker } = require("worker_threads")

let js_string = `
const { workerData, parentPort } = require('worker_threads');

let num = workerData.num || 7
let res = cpu_intensive(num)

parentPort.postMessage(res)

// https://gist.github.com/sqren/5083d73f184acae0c5b7
function cpu_intensive(baseNumber) {
	let result = 0;	
	for (var i = Math.pow(baseNumber, 7); i >= 0; i--) {		
		result += Math.atan(i) * Math.tan(i);
	};
    return result;
}
`

exports.handler = async function (event, callFunction) {
    console.log('ActionSignage: Event: ', event);
    // {message: "Its below freezing!", location: event["sensorID"], chain: 1, duration: 10}

    let num = event.num || 7
    
    let w1 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            workerData: {},
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })
    let w2 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            workerData: {},
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })


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

        try {
            let response = ddb.putItem(params).promise()
            promises.push(response)
        } catch (error) {
            console.log("DynamoDB had some problems")
            console.log(error)
            await new Promise(resolve => setTimeout(resolve, 100)) // Sleep 100ms if this doesnt work
        }

    }
    let r1 = await w1
    let r2 = await w2
    let answers = await Promise.all(promises) 
    return {
        from: "ActionSignage",
        useCaseTable: answers
    }
}
