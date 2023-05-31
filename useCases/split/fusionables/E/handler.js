// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function (event, callFunction) {
    console.log("Event for E:", event)
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
        from: "E"
    }
}

// https://gist.github.com/sqren/5083d73f184acae0c5b7
function cpu_intensive(baseNumber) {
	console.time('cpu_intensive');
	let result = 0;	
	for (var i = Math.pow(baseNumber, 7); i >= 0; i--) {		
		result += Math.atan(i) * Math.tan(i);
	};
	console.timeEnd('cpu_intensive');
    return result;
}