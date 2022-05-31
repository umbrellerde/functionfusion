const AWS = require("aws-sdk");
const { assert } = require("console");

AWS.config.update({ region: process.env["AWS_REGION"] })

const cw = new AWS.CloudWatchLogs();
const s3 = new AWS.S3()

const bucketName = process.env["S3_BUCKET_NAME"]

const logGroupNames = process.env["LOG_GROUP_NAMES"].split(",")
let fusionSet = new Set();
let timeoutMs = null

exports.handler = async function (event) {
    console.log("Starting Extractor with event", event)

    let alternativeTimeout = 180000
    try {
        timeoutMs = parseInt(event["timeout"]) || alternativeTimeout
    } catch (error) {
            //let startTime = Date.now() - 180_000 // TODO make smarter decisions based on what? 3minutes
        //let startTime = Date.now() - 750_000 // 15 Minutes for the cold starts
        //let startTime = Date.now() - 300_000 // 5min for the IoT full test
        //let startTime = Date.now() - 3_600_000 // 30 Minutes for 300 invocations test
        //let startTime = Date.now() - 15_840_000 // 4.5h
        // 86_400_000 48hrs
        timeoutMs = alternativeTimeout
    }

    console.log("TimeoutMs is:", timeoutMs)

    let allInvocations = []

    for (let i = 0; i < logGroupNames.length; i++) {
        let invocatinos = await getInvocationsFromLogGroup(logGroupNames[i])
        allInvocations = allInvocations.concat(invocatinos)
    }
    allInvocations = await Promise.all(allInvocations)

    //allInvocations = mergeRemoteInvocationsByTrace(allInvocations)

    await saveInvocationsToS3(allInvocations)

    fusionSet = new Set();

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { invocations: allInvocations.length },
    }
}

/**
 * Saves the list of Invocations to S3, merges with existing fusion files if it has to
 * Every Fusion Group has its own file, containing a list of (root-) invocations in that fusion group
 */
async function saveInvocationsToS3(invocations) {

    // Filter for only root invocations
    //invocations = invocations.filter(inv => inv["isRootInvocation"] == true)

    let fusionSetups = [...fusionSet]

    console.log("Fusion Setups are: ", fusionSetups)
    console.log("Fusion Set is: ", fusionSet)

    let promises = []
    // Get the old data for these fusion groups and merge it with the new data.
    for (let i = 0; i < fusionSetups.length; i++) {
        let key = fusionSetups[i]
        console.log("...Currently merging Traces for fusiongroup", key)
        let newTraces = invocations.filter(inv => inv["fusionGroup"] == key)
        // Get existing Traces
        let existingTraces = await getFromBucket(bucketName, `${key}.json`)
        //console.log("Got existing traces", existingTraces)

        // Check if the object is not empty
        if (Object.keys(existingTraces).length > 0) {
            //console.log("Rewriting Keys")
            //console.log("Existing Keys before Rewrite:", existingTraces)
            let tracesList = []
            for (const [key, value] of Object.entries(existingTraces)) {
                tracesList.push(value)
            }
            existingTraces = tracesList
        }

        //console.log("Merging newTraces and ExistingTraces: ", newTraces, existingTraces)
        // Merge together
        // TODO Make it a Set and then export the set to a list
        // TODO Better Merge the Old and New Traces
        // --- for every new Trace: Find all Invocations with same Trace Id. Find all Invocations with same currentFunction.
        // ------ For every call of newTraces: filter existingTraces for call with same properties. If it does not exist, add it here.
        // {
        // "traceId": "e2459202fd57f0ae",
        // "fusionGroup": "A.B.C.D.E.F.G",
        // "source": "A",
        // "currentFunction": "A",
        // "billedDuration": 3575,
        // "maxMemoryUsed": 118,
        // "isRootInvocation": true,
        // "startTimestamp": 1647273039359,
        // "endTimestamp": 1647273042932,
        // "internalDuration": 3572,
        // "calls": [
        //     {
        //         "called": "F",
        //         "caller": "A",
        //         "local": true,
        //         "sync": false,
        //         "time": 212
        //     }
        // Old:
        //let mergedTraces = [...new Set([...existingTraces, ...newTraces])] //Object.assign(existingTraces, newTraces)

        for (let i = 0; i < newTraces.length; i++) {
            let currNew = newTraces[i]
            //console.log("Checking new Trace", currNew)
            let found = false
            for (let j=0; j < existingTraces.length; j++) {
                try {
                    let currExisting = existingTraces[j]
                    if (currNew["traceId"] === currExisting["traceId"] && currNew["currentFunction"] === currExisting["currentFunction"] && currNew["startTimestamp"] === currExisting["startTimestamp"]) {
                        found = true
                        // Here: new and existing are the same function invocation
                        if (currNew["calls"].length == currExisting["calls"].length) {
                            // currExisting is up to date, skip to next currExisting
                            //console.log("currNew and currExisting are the same", currNew, currExisting)
                            break
                        } else {
                            //console.log("Merging new and Existing calls into each other", currNew, currExisting)
                            // Merge calls of currNew into calls of currExisting
                            for (let possibleNewCall of currExisting["calls"]) {
                                if (!currNew["calls"].some(o => o["called"] === possibleNewCall["called"] && o["time"] === possibleNewCall["time"])) {
                                    // Call does not already exist!
                                    existingTraces[j]["calls"].push(possibleNewCall)
                                }
                            }
                            // There are now up to date --> Break out of loop
                            break
                        }
                    }
                } catch (error) {
                    console.log("Error during Merging, invocation is", existingTraces[j], error)
                }
                
            }
            if (!found) {
                //console.log("Pushing new onto List:", currNew)
                existingTraces.push(currNew)
            }
        }
        let mergedTraces = existingTraces

        //console.log("Type of Merged Traces is", typeof mergedTraces)
        // Save to S3
        let promise = uploadToBucket(bucketName, `${key}.json`, mergedTraces)
        promises.push(promise)
    }

    await Promise.all(promises)
}

/**
 * Pass this a log group, get a list of invocations back. Some of these might be doublettes
 * @param {string} logGroupName 
 */
async function getInvocationsFromLogGroup(logGroupName) {

    let startTime = Date.now() - timeoutMs
    let endTime = Date.now()

    const allLogStreamsInput = {
        logGroupName: logGroupName,
        limit: 50,
        orderBy: "LastEventTime"
    }

    let allLogStreams = null
    try {
        allLogStreams = await cw.describeLogStreams(allLogStreamsInput).promise()
        // If the last event was before start time delete the logs because they aren't interesting to us
        if (allLogStreams["lastEventTimestamp"] < startTime) {
            console.log("Ignoring the whole log group since it is too old")
            // The last update happened before our start time, so this log group is not important anymore
            // Since they are ordered by LastEventTime, we have found everything we need
            allLogStreams["logStreams"] = []
            // nextToken will also be null so there is no need to null that
        }

        while (allLogStreams["nextToken"]) {
            console.log("Found a next Token:", allLogStreams["nextToken"])
            allLogStreamsInput["nextToken"] = allLogStreams["nextToken"]
            if (allLogStreams["lastEventTimestamp"] < startTime) {
                // The last update happened before our start time, so this log group is not important anymore
                // Since they are ordered by LastEventTime, we have found everything we need
                break
            }
            let newLogStream = await cw.describeLogStreams(allLogStreamsInput).promise()
            allLogStreams["logStreams"] = allLogStreams["logStreams"].concat(newLogStream["logStreams"])
            allLogStreams["nextToken"] = newLogStream["nextToken"]
        }
    } catch (error) {
        console.error("describeLogStreams failed with ", error)
        throw error
    }

    console.log("AllLogStreams has found LogStreams:", allLogStreams["logStreams"].length, "for log group", logGroupName)

    let invocations = []

    for (let i = 0; i < allLogStreams["logStreams"].length; i++) {
        if (i % 100 == 0) {
            console.log("Reading Stream", i, "started", allLogStreams["logStreams"][i]["lastEventTimestamp"])
        }
        let stream = allLogStreams["logStreams"][i]

        const params = {
            startTime: startTime,
            endTime: endTime,
            logGroupName: logGroupName,
            logStreamName: stream["logStreamName"],
            startFromHead: true
        }

        let logEvents = null
        let tries = 1
        // Download the logStream with the given parameters
        while (logEvents == null) {
            try {
                logEvents = await cw.getLogEvents(params).promise()
            } catch (error) {
                console.error("getLogEvents failed with ", error, "on try", tries)
                if (tries > 10) {
                    throw error
                }
                await new Promise(resolve => setTimeout(resolve, 5000 * tries))
                tries++
                continue
            }
        }
        //console.log("Finished reading first events, trying nextForwardToken")
        while(logEvents.hasOwnProperty("nextForwardToken")) {
            //console.log("LogEvents has nextToken", logEvents["nextForwardToken"])
            params["nextToken"] = logEvents["nextForwardToken"]
            let newEvents = null
            while (newEvents == null) {
                try {
                    newEvents = await cw.getLogEvents(params).promise()
                } catch (error) {
                    console.error("getLogEvents with next tokens failed with ", error, "on try", tries)
                    if (tries > 10) {
                        throw error
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000 * tries))
                    tries++
                    continue
                }
            }
            //console.log("New Events Forward Token")
            //console.log(newEvents["nextForwardToken"])
            logEvents["events"] = logEvents["events"].concat(newEvents["events"])
            //console.log("Log Events is now length:", logEvents["events"].length)
            if (newEvents["nextForwardToken"] === logEvents["nextForwardToken"]) {
                // Same response twice ==> Break
                //console.log("Got same FW Token twice, breaking")
                break
            } else {
                logEvents["nextForwardToken"] = newEvents["nextForwardToken"]
            }
            
        }

        if (i % 100 == 0) {
            console.log("Found log Events:", logEvents["events"].length)
        }
        let startI = 0
        let searchingForStart = true
        for (let i = 0; i < logEvents["events"].length; i++) {
            let currentEvent = logEvents["events"][i]
            if (searchingForStart && currentEvent["message"].includes("START RequestId: ")) {
                startI = i
                searchingForStart = false
                //console.log("----- Found Start Message!", currentEvent)
            } else if ((!searchingForStart) && currentEvent["message"].includes("REPORT RequestId: ")) {
                //console.log("----- Found Report Message!", currentEvent)
                searchingForStart = true
                let newInvocation = extractInvocation(logEvents["events"].slice(startI, i + 1))
                if (newInvocation != null) {
                    invocations.push(newInvocation)
                } else {
                   //console.log("The Invocation could not be found")
                }

            }
        }
    }
    return invocations
}

/**
 * All the events in a LogEvents that make up a single invocation.
 * @param {Array<Object>} invocationEvents
 */
function extractInvocation(invocationEvents) {
    assert(invocationEvents[0]["message"].includes("START RequestId"), "An Invocation should start with 'START RequestId'. Events:", invocationEvents)
    assert(invocationEvents[invocationEvents.length - 1]["message"].includes("REPORT RequestId:"), "An Invocation should end with 'REPORT RequestId:'")
    // Get the last Message that should be the report, for example
    // 2022-02-11T15:57:02.506+01:00	REPORT RequestId: 627f1e04-9632-4d5c-8a1f-dbb13218d791 Duration: 1504.20 ms Billed Duration: 1505 ms Memory Size: 128 MB Max Memory Used: 79 MB 

    try {
        let report = invocationEvents[invocationEvents.length - 1]["message"]

        // The second line (first line of the log) should contain the TraceId, for example
        // .replace call replaces newlines with empty string
        //console.log("Amount of Messages are", invocationEvents.length)
        //console.log("First message (TraceId) is", invocationEvents[1]["message"])
        //console.log("Second Message (FirstStep) is", invocationEvents[2]["message"])
        //console.log("Last Message (REPORT) is", invocationEvents[invocationEvents.length - 1]["message"])
        //console.log("All Log Messages Are", invocationEvents)
        let [fusionGroup, source, traceId] = invocationEvents[1]["message"].split("TraceId ")[1].replace(/[\n\r]/g, '').split("-")
        let isRootInvocation = (invocationEvents[2]["message"].split("FirstStep ")[1].replace(/[\n\r]/g, '') === 'true')
        let billedDuration = parseInt(report.split("Billed Duration: ")[1].split(" ")[0])
        let maxMemoryUsed = parseInt(report.split("Max Memory Used: ")[1].split(" ")[0])

        //console.log("Fusion Group is", fusionGroup)
        fusionSet.add(fusionGroup)

        let startTimestamp = parseInt(invocationEvents[1]["timestamp"])
        // Not the report, but the END message ==> second to last message
        let endTimestamp = parseInt(invocationEvents[invocationEvents.length - 2]["timestamp"])

        let calls = []
        let totalDuration = -1

        // Ignore the START and END Messages => Start at 1 and finish at len-1
        for (let i = 1; i < invocationEvents.length - 1; i++) {
            let logLine = invocationEvents[i]["message"].split("INFO")[1]
            if (logLine && logLine.includes("time-")) {
                logLine = logLine.trim()

                if (logLine.startsWith("time-base")) {
                    totalDuration = parseInt(logLine.split(" ")[1])
                    continue
                }

                // Its relevant for timing stuff
                // And looks like this:
                // time-local-true-A-A 481.638
                //   |    |     |  | |  |
                //   |    |     |  | |  |>Duration of call in ms
                //   |    |     |  | |>Called Function      
                //   |    |     |  |>Calling Function
                //   |    |     |>Is this a sync call? (Set by invocating function)  
                //   |    |>Local call or remote call?
                //   |>This is the marker that the logged string is relevant
                let [infoStr, time] = logLine.split(" ")
                time = parseInt(time)
                let info = infoStr.split("-")
                let local = info[1] === "local" // Whether it is a local call => remote otherwise
                let sync = info[2] === "true"
                let caller = info[3]
                let called = info[4]
                calls.push({
                    called: called,
                    caller: caller,
                    local: local,
                    sync: sync,
                    time: time
                })
            }
        }

        let newInvocation = {
            traceId: traceId,
            fusionGroup: fusionGroup,
            source: source,
            currentFunction: calls[0]["caller"],
            billedDuration: billedDuration,
            maxMemoryUsed: maxMemoryUsed,
            isRootInvocation: isRootInvocation,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            internalDuration: totalDuration,
            calls: calls,
        }
        return newInvocation
    } catch (err) {
        // The invocation could not be extracted - we don't really care since this almost never happens...
        console.error(err)
        return null
    }
}

/**
 * 
 * @param {string} bucket The Bucket to save the file to
 * @param {string} key The key (~=filename)
 * @param {Object|Array} body The body that will be JSON.stringify-ed to save to s3 
 */
async function uploadToBucket(bucket, key, body) {
    return await s3.upload({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(body),
    }).promise()
}

/**
 * 
 * @param {string} bucket Bucket to get the file from
 * @param {string} key ~Filename of the file
 * @returns {Object|Array} The Parsed JSON
 */
async function getFromBucket(bucket, key) {

    // Check if the object exists
    let head;
    try {
        head = await s3.headObject({
            Bucket: bucket,
            Key: key
        }).promise()
    } catch (err) {
        return []
    }


    let resp = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise()

    let json = JSON.parse(resp.Body.toString('utf-8'))
    return json
}