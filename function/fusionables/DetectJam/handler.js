// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function(event, callFunction) {
    console.log('DetectJam: Event: ', event);
    // {location: event["sensorID"]}

    // TODO find location of sensor

    // TODO check cameras for slow cars

    // TODO send a warning to Traffic Services

    // TODO reroute cars

    // TODO Signage there is a jam nearby
               
    return {}
}
