// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const { Worker } = require("worker_threads")

let js_string = `
const { workerData, parentPort } = require('worker_threads');

let num = workerData.num || 8.8
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


exports.handler = async function(event, callFunction) {
    console.log('CheckTemperature: Event: ', event);

    let num = event.num || 7
    
    let w1 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })
    let w2 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })
    let r1 = await w1
    let r2 = await w2


    let sensorID = event.originalEvent["sensorID"]
    let chain = event.originalEvent["chain"]

    return {
        from: "CheckTemperature",
        actionSignage: await callFunction("AS", {location: sensorID, chain: chain}, false)
    }
}