// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function(event, callFunction) {
    console.log('ActionSignage: Event: ', event);
    // {message: "Its below freezing!", location: event["sensorID"], chain: 1, duration: 10}

    // TODO find location of sensor

    // TODO find chan signs and send them the message

    console.log("Beep Boop Sending Request to Signs....")
               
    return {}
}
