// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async function(event, callFunction) {
    console.log('AnalyzeSensor: Event: ', event);
    
    let sensorID = Math.floor(Math.random() * 101)
    event = {
        "Temperature": {
            sensorID: sensorID,
            value: (randn_bm() * 50) - 10, // Between -10 and 40
        },
        "Sound": {
            sensorID: sensorID,
            value: (randn_bm() * 50) - 10, // Between -10 and 40
        },
        "AirQuality": {
            sensorID: sensorID,
            value: (randn_bm() * 50) - 10, // Between -10 and 40
        },
        "EmergencyVehicle": {
            sensorID: sensorID,
            value: (randn_bm() * 50) - 10, // Between -10 and 40
        },
    }
    // -------------------------------


    console.log("Got Input Event", event)

    let calls = []

    let checkResult = await callFunction("CW", {originalEvent: event["Temperature"]}, true)
    if (checkResult == false) {
        console.log("Well this shouldn't happen but theoretically: handle failed sensor here")
    }

    // Write the sensor Data to DynamoDB
    await callFunction("SE", event["Temperature"], true)

    calls.push(callFunction("CT", {originalEvent: event["Temperature"]}, false))
    calls.push(callFunction("CS", {originalEvent: event["Sound"]}, false))
    calls.push(callFunction("CA", {originalEvent: event["AirQuality"]}, false))

    // Do some stuff based on the input - this just calls different functions randomly to emulate function-daisy-chains.
    // switch (event["sensor"]) {
    //     case "Temperature":
    //         if (event["value"] < -1 || event["value"] > 20) {
    //             // We should check if the sensor is still functioning: check if nearby sensors have reported comparable values and maybe report it as malfunctioning
    //             let checkResult = await callFunction("CheckSensor", {originalEvent: event}, true)
    //             if (!checkResult.valid) {
    //                 console.log("Temperature Sensor is broken...")
    //                 return await callFunction("MarkSensorBroken", {sensorID: event["sensorID"]}, true)
    //             }
    //         }
    //         if (event["value"] < 0) {
    //             // Below freezing - add warning signage
    //             console.log("Sending Message Cold")
    //             calls.push(callFunction("ActionSignage", {message: "Its below freezing!", location: event["sensorID"], chain: 1, duration: 10}, false))
    //         }
    //         if (event["value"] > 15) {
    //             // Very hot - add warning signage
    //             console.log("Sending Message Hot")
    //             calls.push(callFunction("ActionSignage", {message: "Please remember to drink!", location: event["sensorID"], chain: 1, duration: 10}, false))
    //         }
    //         break
    //     case "Sound":
    //         // If it is always loud, check if it should be quieter and reroute traffic if yes
    //         if (event["value"] > 20) {

    //             let checkResult = await callFunction("CheckSensor", {originalEvent: event}, true)
    //             if (!checkResult.valid) {
    //                 console.log("Sound Sensor is broken...")
    //                 return await callFunction("MarkSensorBroken", {sensorID: event["sensorID"]}, true)
    //             }
    //             console.log("Checking sound Tolerances")
    //             calls.push(callFunction("SoundCheckTolerances", {originalEvent: event}, false))

    //             // If it is a loud bang, check cameras for traffic accident. Raise Alarm, reoute traffic and add signage 
    //             let accident = await callFunction("SoundCheckAccident", {originalEvent: event}, true)
    //             if (accident["isAccident"]) {
    //                 console.log("Detected Accident!")
    //                 calls.push(callFunction("ActionSignage", {message: "Accident Ahead!", location: event["sensorID"], chain: 5, duration: 10}, false))
    //                 calls.push(callFunction("ActionTrafficReroute", {location: event["sensorID"], duration: 10}, false))
    //             }
    //         } else {[
    //             console.log("Sound was not loud")
    //         ]}
    //         break
    //     case "AirQuality":
    //         // If it is bad, check cameras is there is a traffic jam
    //         if (event["value"] < 40) {
    //             console.log("Air Quality is bad - checking for accident")
    //             calls.push(callFunction("DetectJam", {location: event["sensorID"], sieve: 1000000}, false))
    //         }

    //         // If it is very bad, raise an alarm
    //         if (event["value"] < 25) {
    //             console.log("Air Quality is very bad - raising alarm")
    //             calls.push(callFunction("AirQualityAlarm", {originalEvent: event}, false))
    //         }
    //         break
    //     case "EmergencyVehicle":
    //         // Reroute Traffic so that the path infront of the vehicle is free(er)
    //         console.log("Detected Emergency Vehicle")
    //         calls.push(callFunction("ActionSignage", {message: "Please make way for emergency vehicle!", location: event["sensorID"], chain: -5, duration: 5}, false))
    // }

    console.log("AnalyzeSensor: Waiting for calls:", calls.length)

    let results = await Promise.all(calls)

    console.log("AnalyzeSensor: All Promises are done, results are", results)

    return {
        fusionSetup: process.env["FUSION_GROUPS"],
        results: results
    }
}

function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}
