// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

exports.handler = async function(event, callFunction) {
    console.log('DetectJam: Event: ', event);
    // {location: event["sensorID"]}

    // TODO find location of sensor

    // TODO check cameras for slow cars
    await delay(1500)
    let isJam = Math.random() > 0.5

    let promises = []
    // TODO send a warning to Traffic Services
    if (isJam) {
        promises.push(callFunction("ActionTrafficReroute", {location: event["location"]}, false))
        promises.push(callFunction("ActionSignage",{message: "Jam Ahead! Not the delicious one.", location: event["sensorID"], chain: -5, duration: 10}, false))
        promises.push(callFunction("ActionSignage",{message: "Jam is over.", location: event["sensorID"], chain: 2, duration: 10}, false))
    } 
    return await Promise.all(promises)
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))