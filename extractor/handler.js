const AWS = require("aws-sdk");
const { assert } = require("console");

AWS.config.update({region: process.env["AWS_REGION"]})

const cw = new AWS.CloudWatchLogs();
const s3 = new AWS.S3()

const bucketName = process.env["S3_BUCKET_NAME"]

const logGroupNames = process.env["LOG_GROUP_NAMES"].split(",")

exports.handler = async function (event) {
    let allInvocations = []

    for(let i = 0; i < logGroupNames.length; i++) {
        let invocatinos = await getInvocationsFromLogGroup(logGroupNames[i])
        allInvocations = allInvocations.concat(invocatinos)
    }
    allInvocations = await Promise.all(allInvocations)

    //allInvocations = mergeRemoteInvocationsByTrace(allInvocations)

    await saveInvocationsToS3(allInvocations)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { invocations: allInvocations},
    }
}

/**
 * Saves the list of Invocations to S3, merges with existing fusion files if it has to
 * Every Fusion Group has its own file, containing a list of (root-) invocations in that fusion group
 */
async function saveInvocationsToS3(invocations) {

    // Filter for only root invocations
    //invocations = invocations.filter(inv => inv["isRootInvocation"] == true)

    // A List of invocation by fusion group. Normally this should only be one fusion group, but you never know
    let fusionSetups = {}

    for (let i = 0; i < invocations.length; i++) {
        let curr = invocations[i]
        if (!fusionSetups.hasOwnProperty(curr["fusionGroup"])) {
            fusionSetups[curr["fusionGroup"]] = []
        }
        fusionSetups[curr['fusionGroup']].push(curr)
    }

    let promises = []
    // Get the old data for these fusion groups and merge it with the new data.
    for (let key in fusionSetups) {
        let newTraces = fusionSetups[key]
        // Get existing Traces
        let existingTraces = await getFromBucket(bucketName, `${key}.json`)
        console.log("Got existing traces", existingTraces)

        // Check if the object is not empty
        if (Object.keys(existingTraces).length > 0) {
            console.log("Rewriting Keys")
            let tracesList = []
            for (const [key, value] of Object.entries(existingTraces)) {
                console.log("Rewriting Key", key)
                console.log("Rewriting Value", value)
                tracesList.push(value)
            }
            existingTraces = tracesList
        }

        console.log("Merging newTraces and ExistingTraces: ", newTraces, existingTraces)
        // Merge together
        let mergedTraces = Object.assign(existingTraces, newTraces)
        console.log("Merged Traces are:", mergedTraces)
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
    let startTime = Date.now() - 900_000 // TODO get from dynamodb
    let endTime = Date.now()

    const allLogStreamsInput = {
        logGroupName: logGroupName,
    }

    const allLogStreams = await cw.describeLogStreams(allLogStreamsInput).promise()

    let invocations = []

    for (let i = 0; i < allLogStreams["logStreams"].length; i++) {
        let stream = allLogStreams["logStreams"][i]

        const params = {
            startTime: startTime,
            endTime: endTime,
            logGroupName: logGroupName,
            logStreamName: stream["logStreamName"],
        }
        const logEvents = await cw.getLogEvents(params).promise()

        let startI = 0
        for (let i = 0; i < logEvents["events"].length; i++) {
            let currentEvent = logEvents["events"][i]
            if (currentEvent["message"].includes("START RequestId: ")) {
                startI = i
            } else if (currentEvent["message"].includes("REPORT RequestId: ")) {
                invocations.push(extractInvocation(logEvents["events"].slice(startI, i + 1)))
                startI = 0
            }
        }
    }
    return invocations
}

/**
 * All the events in a LogEvents that make up a single invocation. TODO This is stored in dynamo.
 * @param {Array<Object>} invocationEvents
 */
function extractInvocation(invocationEvents) {
    assert(invocationEvents[0]["message"].includes("START RequestId"), "An Invocation should start with 'START RequestId'")
    assert(invocationEvents[invocationEvents.length - 1]["message"].includes("REPORT RequestId:"), "An Invocation should end with 'REPORT RequestId:'")
    // Get the last Message that should be the report, for example
    // 2022-02-11T15:57:02.506+01:00	REPORT RequestId: 627f1e04-9632-4d5c-8a1f-dbb13218d791 Duration: 1504.20 ms Billed Duration: 1505 ms Memory Size: 128 MB Max Memory Used: 79 MB 
    let report = invocationEvents[invocationEvents.length - 1]["message"]

    // The second line (first line of the log) should contain the TraceId, for example
    // .replace call replaces newlines with empty string
    let [fusionGroup, source, traceId] = invocationEvents[1]["message"].split("TraceId ")[1].replace(/[\n\r]/g, '').split("-")
    let isRootInvocation = (invocationEvents[2]["message"].split("FirstStep ")[1].replace(/[\n\r]/g, '') === 'true')
    let billedDuration = parseInt(report.split("Billed Duration: ")[1].split(" ")[0])
    let maxMemoryUsed = parseInt(report.split("Max Memory Used: ")[1].split(" ")[0])

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
            //   |    |     |  | | Called Function      
            //   |    |     |  | Calling Function
            //   |    |     | Is this a sync call? (Set by invocating function)  
            //   |    | Local call or remote call?
            //   | This is the marker that the logged string is relevant
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
}

/**
 * 
 * @param {string} bucket The Bucket to save the file to
 * @param {string} key The key (~=filename)
 * @param {Object|Array} body The body that will be JSON.stringify-ed to save to s3 
 */
async function uploadToBucket(bucket, key, body) {
    let resp = await s3.upload({
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
        return {}
    }


    let resp = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise()

    let json = JSON.parse(resp.Body.toString('utf-8'))
    return json
}