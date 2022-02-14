const AWS = require("aws-sdk");
const { assert } = require("console");
const cw = new AWS.CloudWatchLogs({ region: process.env["AWS_REGION"] }); // TODO Env Region
AWS.config.update({region: process.env["AWS_REGION"]})
const ddb = new AWS.DynamoDB()



//const functions = process.env["functions"]

exports.handler = async function (event) {

    let logGroupNames = ["/aws/lambda/fusion-function-A", "/aws/lambda/fusion-function-B", "/aws/lambda/fusion-function-C", "/aws/lambda/fusion-function-D"]
    let allInvocations = []

    for(let i = 0; i < logGroupNames.length; i++) {
        let invocatinos = await getInvocationsFromLogGroup(logGroupNames[i])
        allInvocations = allInvocations.concat(invocatinos)
    }

    allInvocations = await Promise.all(allInvocations)

    let filteredInvocatinos = allInvocations.filter(inv => inv["isRootInvocation"] == true)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { invocations: allInvocations, filtered: filteredInvocatinos },
    }
}

/**
 * Saves the list of Invocations to Dynamo, does not fail if an invocation is saved twice.
 */
function saveInvocationsToDynamo() {

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
    let traceId = invocationEvents[1]["message"].split("TraceId ")[1].replace(/[\n\r]/g, '')
    let isRootInvocation = (invocationEvents[2]["message"].split("FirstStep ")[1].replace(/[\n\r]/g, '') === 'true')
    let billedDuration = parseInt(report.split("Billed Duration: ")[1].split(" ")[0])
    let maxMemoryUsed = parseInt(report.split("Max Memory Used: ")[1].split(" ")[0])
    let startTimestamp = Date.parse(invocationEvents[1]["message"].split(" ")[0].split("\t")[0])

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
        billedDuration: billedDuration,
        maxMemoryUsed: maxMemoryUsed,
        isRootInvocation: isRootInvocation,
        startTimestamp: startTimestamp,
        internalDuration: totalDuration,
        calls: calls,
    }
    return newInvocation

}