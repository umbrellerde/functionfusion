// This is the exporter using export tasks

const AWS = require("aws-sdk");
const zlib = require("zlib")

AWS.config.update({ region: process.env["AWS_REGION"] })

const cw = new AWS.CloudWatchLogs();
const s3 = new AWS.S3()

const bucketName = process.env["S3_BUCKET_NAME"]

const logGroupNames = process.env["LOG_GROUP_NAMES"].split(",")
let fusionSet = new Set();
let fusionizeMagicString = "FSMSG"

// TODO https://registry.terraform.io/modules/gadgetry-io/cloudwatch-logs-exporter/aws/latest
exports.handler = async function (event) {
    console.log("Starting Extractor with event", event)

    let newerThanMs = parseInt(event["startTimeMs"]) || 1

    if (parseInt(event["startTimeMs"]) == 0) { // JS is a big pile of weird behaviour
        newerThanMs = 0
    }

    console.log("newerThanMs is:", newerThanMs)
    console.log("which is as a date", new Date(newerThanMs))
    console.log("which is from now (positive hopefully)", Date.now() - new Date(newerThanMs))

    let allInvocations = []

    let exportTaskIds = await createExportTasks(newerThanMs)

    let finishedInvocations = await getAllInvocations(exportTaskIds, newerThanMs)

    await saveInvocationsToS3(finishedInvocations)

    fusionSet = new Set();

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { invocations: finishedInvocations.length },
    }
}

async function createExportTasks(newerThanMs) {
    let exportTaskIds = []
    let endTimeMs = Number.MAX_SAFE_INTEGER //Date.now()
    console.log(`End time for export is ${endTimeMs}`)

    for (let i = 0; i < logGroupNames.length; i++) {
        let logGroupName = logGroupNames[i]
        let startTime = newerThanMs

        var exportParams = {
            taskName: `${logGroupName}-${startTime}`,
            logGroupName: logGroupName,
            from: startTime,
            to: endTimeMs,
            destination: bucketName,
            destinationPrefix: `exportedLogs${logGroupName}` // Log group name contains a / as fist symbol
        }
        for (let tries = 0; tries < 20; tries++) {
            try {
                let exportTaskId = await cw.createExportTask(exportParams).promise()
                exportTaskIds.push({ "id": exportTaskId["taskId"], "logGroup": logGroupName })
                await new Promise(r => setTimeout(r, 4000)) // Seems like sleeping makes it easier to not hit the throttling
                break
            } catch (e) {
                if (tries > 1) {
                    console.log("Error from creating export task with params is", exportParams, "on try", tries)
                    console.log(e)
                }
                if (e.retryDelay > 5000) {
                    console.log("Retry Delay for exportTask is", e.retryDelay, "sleeping for", e.retryDelay + 1000)
                    await new Promise(r => setTimeout(r, e.retryDelay + 1000))
                } else {
                    await new Promise(r => setTimeout(r, 5000 * (tries + 1)))
                }

            }
        }
    }
    return exportTaskIds
}

async function getAllInvocations(exportTaskIds, newerThanMs) {
    // Simplest thing is query tasks periodically until one is finished and then extract its invocations.
    let allInvocations = []
    for (let i = 0; i < exportTaskIds.length; i++) {
        let currentTask = exportTaskIds[i]
        // Wait for the task to be complete, then get the invocations for this event


        var describeParams = {
            taskId: currentTask["id"]
        }

        for (let tries = 0; tries < 10; tries++) {
            let exportStatus = await cw.describeExportTasks(describeParams).promise()
            if (exportStatus.exportTasks[0].status.code === "COMPLETED") {
                let events = await getEventsFromExport(currentTask["logGroup"], newerThanMs)
                let invocations = await getInvocationsFromEvents(events)
                allInvocations.push(invocations)
                break
            }
            await new Promise(r => setTimeout(r, 2000 * (tries + 1))); // Wait a little bit if extract failed
        }

    }
    return allInvocations.flat()
}

/**
 * Given the logGroup, find all the gzipped files in s3 that belong to this log group, extract them and concatenate them to the nice json we expect.
 * Also needs to turn the text files in s3 into the json file we expect
 * @param {string} logGroupNamePrefix 
 * @returns {object} object with these properties:     
 * //     events: [
    //         {
    //             "message": "The string that was logged (+ START REPORT etc.)",
    //             "timestamp": 123456790, // unix timestamp
    //         }, ...
    //     ]
 */
async function getEventsFromExport(logGroupNamePrefix, newerThanMs) {
    // List all files in the export/logGroupName Prefix
    let listObjectsParam = {
        Bucket: bucketName,
        Prefix: `exportedLogs${logGroupNamePrefix}`
    }

    let objects = await s3.listObjectsV2(listObjectsParam).promise()
    // console.log("listObjectsv2 answered:")
    // console.log(objects)

    while (objects["NextContinuationToken"]) {
        console.error("!!!! There were too many files to list in one ListObjects")
        let listObjectsParam = {
            Bucket: bucketName,
            Prefix: `exportedLogs${logGroupNamePrefix}`,
            ContinuationToken: objects["NextContinuationToken"]
        }

        let moreObjects = await s3.listObjectsV2(listObjectsParam).promise()
        console.log("Got even more Objects...")

        objects["NextContinuationToken"] = moreObjects["NextContinuationToken"]
        objects["Contents"] = objects["Contents"].concat(moreObjects["Contents"])

        if(!moreObjects["IsTruncated"]) {
            console.log("IsTrunc is false")
            break
        }
    }
    // Download them and extract the gz to text
    let fileNames = []
    let allKeysToDeleteLater = []
    for (let i = 0; i < objects["Contents"].length; i++) {
        let key = objects["Contents"][i]["Key"]
        allKeysToDeleteLater.push(key)
        let lastModifiedMs = new Date(objects["Contents"][i]["LastModified"]).getTime()
        if (key.includes("aws-logs-write-test")) {
            continue
            // } // Not really necessary since only the newest export is in there anyway
            // else if (lastModifiedMs < newerThanMs) {
            //     console.log("Last Modified is", lastModifiedMs)
            //     console.log("Only looking for files newer than", newerThanMs)
            //     console.log("Modified is smaller than newerThan, so we are skipping this file")
            //     continue
        } else {
            fileNames.push(key)
        }
    }
    // We only need one log stream even if it is in more than one export....
    // Not necessary since old files are moved away
    // let logStreamSets = new Set()
    // fileNames = fileNames.filter(elem => {
    //     let streamName = elem.split("/").slice(-2, -1)[0]
    //     if (logStreamSets.has(streamName)) {
    //         return false
    //     } else {
    //         logStreamSets.add(streamName)
    //         return true
    //     }
    // })
    //console.log("File Names filtered Down", fileNames)

    let events = []
    for (let i = 0; i < fileNames.length; i++) {
        let fname = fileNames[i]

        // "exportedLogs/aws/lambda/fusion-function-A-128/a89f04c2-13aa-47eb-b5d0-8c12ecddf8ba/2023-01-06-[$LATEST]a4f1a07fd9184d6ca66ec17b9eb13db2/000000.gz"
        //console.log("Downloading file", fname)
        let functionNameUglyExtraction = fileNames[i].split("/")[3].split("-")[2]

        let resp;
        
        try {
            resp = await s3.getObject({
                Bucket: bucketName,
                Key: fname
            }).promise()
        } catch (e) {
            console.error("Error during getObject: (sleeping 5s and trying again...)")
            console.error(e);
            await new Promise(r => setTimeout(r, 5000));
            resp = await s3.getObject({
                Bucket: bucketName,
                Key: fname
            }).promise()
        }

        let textResponse = zlib.gunzipSync(resp.Body).toString("ascii")
        //let textResponse = require('child_process').execSync('gzip -d -c', { input: resp.Body }).toString('ascii')
        //console.log("Text Response is", textResponse)
        //console.log(zlib.gunzipSync(content).toString('utf8'))
        let logLinesStrings = textResponse.split("\n\n")
        for (let i = 0; i < logLinesStrings.length - 1; i++) {
            try {
                if (logLinesStrings[i].includes("START RequestId")
                    || logLinesStrings[i].includes("END RequestId")
                    || logLinesStrings[i].includes("REPORT RequestId")) {
                    let controlMsgSplit = logLinesStrings[i].split(" ")
                    events.push({
                        requestId: controlMsgSplit[3].split("\t")[0],
                        message: controlMsgSplit.slice(1).join(" "),
                        timestamp: Date.parse(controlMsgSplit[0]),
                        sourceFunction: functionNameUglyExtraction
                    })
                } else {
                    // Just a normal line
                    let parts = logLinesStrings[i].split("\t")
                    // parts[3]: "The string that was logged (+ START REPORT etc.)",
                    // "timestamp": 123456790, // unix timestamp
                    if (parts.length > 2 && parts[3].startsWith(fusionizeMagicString)) {
                        events.push({
                            requestId: parts[1], // Is this ugly? Yes. But it does work, and I dont think that cloudwatch will ever change this format.
                            message: parts[3],
                            timestamp: Date.parse(parts[0].split(" ")[1]),
                            sourceFunction: functionNameUglyExtraction
                        })
                    } // else this is just a normal logged message that we can safely ignore

                }
            } catch (error) {
                console.error("Can not read Log Line! Ignoring it, but maybe thats a bad idea???", logLinesStrings[i])
                console.error(error)
            }

        }
    }

    // Delete ALL the files so that they will not come up in the next export

    if(allKeysToDeleteLater.length < 100) {
        let deleteParams = {
            Bucket: bucketName,
            Delete: {
                Objects: allKeysToDeleteLater.map(e => { return { Key: e } })
            }
        }
        console.log("Deleting less than 100 Objects... ")
        for(let i = 0; i < 5; i++) {
            try {
                let deleted = await s3.deleteObjects(deleteParams).promise()
                break
            } catch(e) {
                console.error("Error deleting Object.. retrying")
                console.error(deleteParams)
                console.error(e)
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            }
        }
    } else {
        // Do something complicated to split the list up into smaller chunks??

        console.log("Deleting more than 100 Objects... ")

        const chunkSize = 100;
        for (let i = 0; i < allKeysToDeleteLater.length; i += chunkSize) {
            const currentKeysToDeleteLater = allKeysToDeleteLater.slice(i, i + chunkSize);
            let deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: currentKeysToDeleteLater.map(e => { return { Key: e } })
                }
            }
            for(let i = 0; i < 5; i++) {
                try {
                    let deleted = await s3.deleteObjects(deleteParams).promise()
                    break
                } catch(e) {
                    console.error("Error deleting Object.. retrying")
                    console.error(deleteParams)
                    console.error(deleteParams.Delete.Objects[0])
                    console.error(e)
                    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                }
            }
        }
    }

    
    // No thats not good try moving them instead
    // Move all files to another folder so that they will not be read in again for the next export
    // let destinationFolder = "oldExportedLogs"
    // for (let i = 0; i < allKeysToDeleteLater.length; i++) {
    //     const currKey = allKeysToDeleteLater[i];
    //     // await s3.copyObject({
    //     //     Bucket: bucketName,
    //     //     CopySource: `${bucketName}/${currKey}`,  // old file Key
    //     //     Key: `${destinationFolder}${currKey.replace("exportedLogs", '')}`, // new file Key
    //     // }).promise();

    //     await s3.deleteObject({
    //         Bucket: bucketName,
    //         Key: currKey,
    //     }).promise();
    //     console.log(`moved ${currKey} to ${destinationFolder}`)
    // }

    return events
}


/**
 * Pass this a log group, get a list of invocations back. Some of these might be doublettes
 * @param {string} logEvents
 */
async function getInvocationsFromEvents(logEvents) {

    if (logEvents.length == 0) {
        return []
    }

    // TODO right here we expect the following setup:
    // let logEventsTest = {
    //     events: [
    //         {
    //             "message": "The string that was logged (+ START REPORT etc.)",
    //             "timestamp": 123456790, // unix timestamp
    //         }, ...
    //     ]
    // }
    // These are all the messages inside a single log group. They contain FZmessages as well as StartStop messages
    // TODO sort them by timestamp as reported by FZMSG as well, delete all lines that are not in this format

    // Sort logEvents by Timestamp first
    logEvents.sort((a, b) => a.timestamp - b.timestamp)

    // Iterate over all messages and try to find the relevant TraceId for all START and REPORT messages
    let cleanedEvents = []

    // First do a pass with events to find requestId c.a.= traceId + function
    let noControlMessages = logEvents.filter(e => e.message.startsWith(fusionizeMagicString))
    let onlyControlMessages = logEvents.filter(e => !e.message.startsWith(fusionizeMagicString))
    for (let i = 0; i < noControlMessages.length; i++) {
        let currentEvent = noControlMessages[i]
        // For every Invocation
        let content = JSON.parse(currentEvent["message"].replace(fusionizeMagicString, ""))
        // e.g. {
        //     traceId: currentTraceId,
        //     time: Date.now(),
        //     type: "time-asdf",
        //     sourceFunction: "....",
        //     content: content,
        //     ......
        // }
        content.cloudWatchTimestamp = currentEvent["timestamp"]
        content.requestId = currentEvent["requestId"]
        cleanedEvents.push(content)
    }

    for (let i = 0; i < onlyControlMessages.length; i++) {
        let currentEvent = onlyControlMessages[i]
        if (currentEvent["message"].includes("START RequestId: ")) {

            let traceId = null
            try {
                traceId = cleanedEvents.find(e => e.requestId === currentEvent.requestId).traceId
            } catch (error) {
                continue
            }

            let startMessage = {
                traceId: traceId,
                type: "START",
                time: currentEvent["timestamp"],
                cloudWatchTimestamp: currentEvent["timestamp"],
                sourceFunction: currentEvent["sourceFunction"],
                content: {
                    // What is there to put here?
                }
            }
            cleanedEvents.push(startMessage)

        } else if (currentEvent["message"].includes("REPORT RequestId: ")) {
            // Get the traceId that most of the last messages have. But we can also just use the last traceId?
            let traceId = null
            try {
                traceId = cleanedEvents.find(e => e.requestId === currentEvent.requestId).traceId
            } catch (error) {
                continue
            }

            let reportMessage = {
                traceId: traceId,
                type: "REPORT",
                time: currentEvent["timestamp"],
                sourceFunction: currentEvent["sourceFunction"],
                content: {
                    billedDuration: parseInt(currentEvent["message"].split("Billed Duration: ")[1].split(" ")[0]),
                    maxMemoryUsed: parseInt(currentEvent["message"].split("Max Memory Used: ")[1].split(" ")[0])
                }
            }
            cleanedEvents.push(reportMessage)

            eventsSinceLastStop = 0
        } else if (currentEvent["message"].includes("END ")) {
            // Get the traceId that most of the last messages have. But we can also just use the last traceId?
            let traceId = null
            try {
                traceId = cleanedEvents.find(e => e.requestId === currentEvent.requestId).traceId
            } catch (error) {
                continue
            }

            let endMessage = {
                traceId: traceId,
                type: "END",
                time: currentEvent["timestamp"],
                sourceFunction: currentEvent["sourceFunction"],
                content: {}
            }
            cleanedEvents.push(endMessage)

            eventsSinceLastStop = 0
        }
    }

    let accMap = new Map()
    // Map of Map. traceId -> function name -> list of events in that function name
    let traceIdMap = cleanedEvents.reduce((accMap, newEvent) => {
        if (accMap.get(newEvent.traceId) == undefined) {
            accMap.set(newEvent.traceId, new Map())
        }
        if (accMap.get(newEvent.traceId).get(newEvent.sourceFunction) == undefined) {
            accMap.get(newEvent.traceId).set(newEvent.sourceFunction, [])
        }
        accMap.get(newEvent.traceId).get(newEvent.sourceFunction).push(newEvent)
        return accMap
    }, accMap)

    // The Format that they will be saved in
    invocationsList = []
    traceIdMap.forEach(functionName => {
        functionName.forEach(events => {
            try {

                let initEvent = events.find(e => e.type == "init")
                let callEvents = events.filter(e => e.type == "call")
                let report = events.find(e => e.type == "REPORT")
                // This is probably happening since there are some events without a REPORT, so they must  be somewhere
                /*
                let reports = events.filter(e => e.type == "REPORT")
                if(reports.length > 1) {
                    console.error("This message has more than one report!")
                    //console.error(events)
                }
                */

                let timeBase = events.find(e => e.type == "time-base")

                let calls = callEvents.map(e => e.content)

                let lastEventExceptReport = events.filter(e => e.type !== "REPORT").reduce((prev, current) => {
                    return (prev.time > current.time) ? prev : current
                })// This will be the last message with will be time-base or END

                if (initEvent == undefined || report == undefined || callEvents == undefined) {
                    console.log("Some events were not found. Ignoring this invocation. init,report,calls.length is:")
                    console.log(initEvent)
                    console.log(report)
                    console.log(callEvents.length)
                    return
                }

                let initEventTimestamp = initEvent.time // This is the cloudWatch time and not the function time. So this may be off. Use InternalDuration for actual 

                let newInvocation = {
                    traceId: initEvent.traceId,
                    fusionGroup: initEvent.content.fusionGroup,
                    source: initEvent.traceId.split("-")[1],
                    currentFunction: initEvent.sourceFunction,
                    currentTask: calls[0]["caller"], // TODO get this differently somehow.... Some invocations have no calls?
                    billedDuration: report.content.billedDuration,
                    memoryAvail: initEvent.content.memoryAvail,
                    maxMemoryUsed: report.content.maxMemoryUsed,
                    isRootInvocation: initEvent.content.isRootInvocation,
                    isColdStart: initEvent.content.isColdStart,
                    startTimestamp: initEventTimestamp,
                    endTimestamp: lastEventExceptReport.time,
                    internalDuration: timeBase.content.ms,
                    calls: calls,
                }
                fusionSet.add(initEvent.content.fusionGroup)
                invocationsList.push(newInvocation)
            } catch (e) {
                console.error("Was not able to read invocation, skipping it....")
                console.error(e)
                console.error(events)
            }
        })
    })
    return invocationsList
}

/**
 * 
 * @param {string} bucket The Bucket to save the file to
 * @param {string} key The key (~=filename)
 * @param {Object|Array} body The body that will be JSON.stringify-ed to save to s3 
 */
async function uploadToBucket(bucket, key, body) {
    return s3.upload({
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

/**
 * Saves the list of Invocations to S3, merges with existing fusion files if it has to
 * Every Fusion Group has its own file, containing a list of (root-) invocations in that fusion group
 */
async function saveInvocationsToS3(invocations) {

    // Filter for only root invocations
    //invocations = invocations.filter(inv => inv["isRootInvocation"] == true)
    console.log("Saving Invocations to s3", invocations.length, fusionSet)

    let fusionSetups = [...fusionSet]

    let promises = []
    // Get the old data for these fusion groups and merge it with the new data.
    for (let i = 0; i < fusionSetups.length; i++) {
        let key = fusionSetups[i]
        console.log("...Currently merging Traces for fusiongroup", key)
        let newTraces = invocations.filter(inv => inv["fusionGroup"] == key)
        // Get existing Traces
        let existingTraces = await getFromBucket(bucketName, `traces/${key}.json`)
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

        for (let i = 0; i < newTraces.length; i++) {
            let currNew = newTraces[i]
            //console.log("Checking new Trace", currNew)
            let found = false
            for (let j = 0; j < existingTraces.length; j++) {
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
        let promise = uploadToBucket(bucketName, `traces/${key}.json`, mergedTraces)
        promises.push(promise)
    }

    await Promise.all(promises)
}

function mode(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a).length
        - arr.filter(v => v === b).length
    ).pop();
}

module.exports = {
    handler: exports.handler,
    createExportTasks: createExportTasks,
    getEventsFromExport: getEventsFromExport,
    getInvocationsFromEvents: getInvocationsFromEvents,
    getAllInvocations: getAllInvocations
}
