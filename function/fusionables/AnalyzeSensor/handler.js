// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function(event, callFunction) {
    console.log('AnalyzeSensor: Event: ', event);

    // TODO move to workload generator
    let sensors = ["Temperature", "Sound", "AirQuality", "EmergencyVehicle"]
    
    event = {
        sensor: sensors[Math.floor(Math.random() * sensors.length)],
        sensorID: Math.floor(Math.random() * 101),
        value: (randn_bm() * 50) - 10, // Between -10 and 40
    }
    // -------------------------------

    let calls = []

    // calls.push() the promise that writes the value to DynamoDB

    switch (event["sensor"]) {
        case "Temperature":
            if (event["value"] < -5 || event["value"] > 35) {
                // We should check if the sensor is still functioning: check if nearby sensors have reported comparable values and maybe report it as malfunctioning
                let checkResult = await callFunction("CheckSensor", {originalEvent: event}, true)
                if (!checkResult.valid) {
                    return await callFunction("MarkSensorBroken", {sensorID: event["sensorID"]}, true)
                }
            }
            if (event["value"] < 0) {
                // Below freezing - add warning signage
                calls.push(callFunction("ActionSignage", {message: "Its below freezing!", location: event["sensorID"], chain: 1, duration: 10}, false))
            }
            if (event["value"] > 35) {
                // Below freezing - add warning signage
                calls.push(callFunction("ActionSignage", {message: "Please remember to drink!", location: event["sensorID"], chain: 1, duration: 10}, false))
            }
            break
        case "Sound":
            // If it is always loud, check if it should be quieter and reroute traffic if yes
            if (event["value"] > 35) {

                let checkResult = await callFunction("CheckSensor", {originalEvent: event}, true)
                if (!checkResult.valid) {
                    return await callFunction("MarkSensorBroken", {sensorID: event["sensorID"]}, true)
                }

                calls.push(callFunction("SoundCheckTolerances", {originalEvent: event}, false))

                // If it is a loud bang, check cameras for traffic accident. Raise Alarm, reoute traffic and add signage 
                let accident = await callFunction("SoundCheckAccident", {originalEvent: event}, true)
                if (accident["isAccident"]) {
                    calls.push(callFunction("ActionSignage", {message: "Accident Ahead!", location: event["sensorID"], chain: 5, duration: 10}, false))
                    calls.push(callFunction("ActionTrafficReroute", {location: event["sensorID"], duration: 10}, false))
                }
            }
            break
        case "AirQuality":
            // If it is bad, check cameras is there is a traffic jam
            if (event["value"] < 5) {
                calls.push(callFunction("DetectJam", {location: event["sensorID"]}, false))
            }

            // If it is very bad, raise an alarm
            if (event["value"] < 1) {
                calls.push(callFunction("AirQualityAlarm", {originalEvent: event}, false))
            }
            break
        case "EmergencyVehicle":
            // Reroute Traffic so that the path infront of the vehicle is free(er)
            calls.push(callFunction("ActionSignage", {message: "Please make way for emergency vehicle!", location: event["sensorID"], chain: -5, duration: 5}, false))
    }

    let results = Promise.all(calls)

    return {
        results: results
    }
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}
