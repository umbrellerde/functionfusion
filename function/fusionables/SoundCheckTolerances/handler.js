// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function(event, callFunction) {
    console.log('SoundCheckTolerances: Event: ', event);

    let callingEvent = event["originalEvent"]

    // TODO check nearby microphones for comparable sound levels

    // TODO Maybe reroute traffic if it is very bad
               
    return {
        message: "Nearby microphones have picked up comparable sounds",
        sensorID: callingEvent["sensorID"]
    }
}