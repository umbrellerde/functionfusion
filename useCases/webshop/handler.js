let coldStartTime = Date.now()
const https = require("https")
const AWS = require("aws-sdk")
const crypto = require("crypto")

const otherFunctions = require("setup.json")

let basePath = ""
let baseUrl = ""
const functionToHandle = process.env["FUNCTION_TO_HANDLE"]
//let fusionGroups = getFusionGroupsFromEnv()
let currentTraceId = null
let isColdStart = true

exports.handler = async function (event) {
    let eventStart = Date.now()
    // This root handler might be invoked sync or async - we don't really care. Maybe the response will fall into the void.

    // see ExampleLog.md for possible invocation types
    let input = getInputFromEvent(event)

    let firstStepInChain = false

    // If the traceId is generated here set firstStep to true
    if (!input.hasOwnProperty('traceId')) {
        let traceId = generateTraceId()
        input['traceId'] = traceId
        firstStepInChain = true
    }

    // Global variable used when calling another function
    currentTraceId = input['traceId']

    // Read by the extractor
    // console.log("TraceId", currentTraceId)
    // console.log("FirstStep", firstStepInChain)
    // console.log("ColdStart", isColdStart)
    // console.log("Memory", process.env["AWS_LAMBDA_FUNCTION_MEMORY_SIZE"])
    logRelevantMessage("init", {
        isRootInvocation: firstStepInChain,
        isColdStart: isColdStart,
        fusionGroup: otherFunctions["traceName"],
        memoryAvail: process.env["AWS_LAMBDA_FUNCTION_MEMORY_SIZE"]
    })
    if(isColdStart) {
        //console.log("overhead-coldstartToEvent", eventStart - coldStartTime)
        logRelevantMessage("overhead-coldstartToEvent", {
            ms: eventStart - coldStartTime
        })
    }
    isColdStart = false

    // Invoke the function with await be cause execution stops when this function returns
    let timeBase = Date.now()
    //console.log("overhead-eventStartToInvokeLocal", timeBase - eventStart)
    logRelevantMessage("overhead-eventStartToInvokeLocal", {
        ms: timeBase - eventStart
    })
    let result = await invokeLocal(functionToHandle, input, true)
    //console.log("time-base", Date.now() - timeBase)
    logRelevantMessage("time-base", {
        ms: Date.now() - timeBase
    })

    console.log("Result", result)

    //console.log("overhead-event", Date.now() - eventStart)
    logRelevantMessage("overhead-event", {
        ms: Date.now() - eventStart
    })
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
    }
}

/**
 * 
 * @param {*} event The original event to find the Base URL
 * @param {*} taskName  The next step to call - will be appended to base url
 * @param {*} data  The data to call the next function with
 */
async function invokeRemote(taskName, data, sync = false) {
    let timeRemote = Date.now()
    const [baseUrl, basePath] = await getUrlsForRemoteCall(taskName, sync)
    return new Promise((resolve, reject) => {

        let pathPart = otherFunctions["rules"][functionToHandle][taskName][sync ? "sync" : "async"]["url"]
        const options = {
            host: baseUrl,
            // onlyStage/SYNC-A to call A sync
            // onlyStage/A to call A async
            path: `/${basePath}/${pathPart}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }

        console.log("Sending Request:", options)
        let req = https.request(options, (res) => {
            resultData = ''
            res.on('data', (d) => {
                resultData += d
            })
            res.on('end', () => {
                if (sync) {
                    if (resultData == '') {
                        throw new Error("The response to a supposedly sync request was empty, which means that is was sent to an async endpoint. Please fix the optimizer. options=" + options)
                    }
                    let json = JSON.parse(resultData) // If the response was empty the request was sent to an async endpoint, which means there is an error in the optimizer
                    //console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
                    logRelevantMessage("call", {
                        local: false,
                        sync: sync,
                        caller: functionToHandle,
                        called: taskName,
                        time: Date.now() - timeRemote
                    })
                    resolve(json)
                } else {
                    // Async Response is empty (it just has lots of headers and stuff...)
                    //console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
                    logRelevantMessage("call", {
                        local: false,
                        sync: sync,
                        caller: functionToHandle,
                        called: taskName,
                        time: Date.now() - timeRemote
                    })
                    resolve({})
                }
            })
        })
        req.on('error', (e) => {
            console.log('Request Error', e)
            //console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
            logRelevantMessage("time", {
                local: false,
                sync: sync,
                caller: functionToHandle,
                called: taskName,
                time: Date.now() - timeLocal
            })
            reject(e)
        })
        req.write(JSON.stringify(data))
        req.end()
    })
}

async function invokeLocal(taskName, input, sync) {
    let timeLocal = Date.now()
    let currentHandler = getHandler(taskName)
    let res = null
    if(sync) {
        res = await currentHandler.handler(input, callFunction)
    } else {
        res = currentHandler.handler(input, callFunction)
    }
    //console.log(`time-local-${sync}-${functionToHandle}-${taskName}`, Date.now() - timeLocal)
    logRelevantMessage("call", {
        local: true,
        sync: sync,
        caller: functionToHandle,
        called: taskName,
        time: Date.now() - timeLocal
    })
    return res
}

function getInputFromEvent(event) {
    // If the event has the property requestContext we assume its a (sync) HTTP request
    if (event.requestContext) {
        return JSON.parse(event.body)
    } else {
        return event
    }
}

async function getUrlsForRemoteCall(step, sync) {
    // TODO get the url that should be used from somewhere else, maybe the optimizer/coldstarts could get them and put them into an env var whenever they run? This means that the fusion handler only needs to get the url from APIGw during the first run. On the other hand this greatly reduces experiment validity so let's not do it maybe.
    if (basePath === "") {
        let startTime = Date.now()
        try{
            let apigwUrls = require("apigw.json")
            baseUrl = apigwUrls["url"]
            basePath = apigwUrls["path"]
            console.log("Used optideployer-provided apigw urls")
        }catch(e) {
            baseUrl = "onlyStage" //process.env["stage_name"] if we want to be fancy, but we don't want to

            let apigw = new AWS.APIGateway();
            let promise = new Promise((resolve, reject) => {
                let req = apigw.getRestApis({}, function (err, data) {
                    if (err) reject(err)
                    else resolve(data.items)
                })
                req.send()
            })
            let result = await promise
    
            let apiId = result.filter((i) => i.name === "lambda-api")[0].id
            // everything before the last slash , everything after the last slash
            basePath = `${apiId}.execute-api.${process.env["AWS_DEFAULT_REGION"]}.amazonaws.com`
            console.log("Used self-gotten apigw urls")
        }
        //console.log("overhead-ApiCallUrls", Date.now() - startTime)
        logRelevantMessage("overhead-ApiCallUrls", {
            ms: Date.now() - startTime
        })
    }
    return [basePath, baseUrl]
}

function getHandler(resource) {
    return require(`./fusionables/${resource}/handler`)
}

function shouldCallTaskLocally(otherName, sync) {
    return otherFunctions["rules"][functionToHandle][otherName][sync ? "sync" : "async"]["strategy"] === "local"
}


// TODO create GenerateCallFunction mit Parameter der aktuellen Funktion damit man das in den Logs besser sehen kann
/**
 * 
 * @param {string} name the name of the function that should be called
 * @param {*} input input to pass to the function
 * @param {*} sync whether the response should be await-ed.
 * @returns (A Promise) containing the result, if sync is true. Otherwise returns a promise that contains something (either {} if the request was sent to another function or the result) that must be await-ed before the function ends, otherwise their execution may be finished prematurely
 */
function callFunction(name, input, sync) {
    input['traceId'] = currentTraceId
    if (shouldCallTaskLocally(name, sync)) {
        console.log("I should call function", name, "with input", input, "and sync", sync, "locally")
        return invokeLocal(name, input, sync)
    } else {
        console.log("I should call function", name, "with input", input, "and sync", sync, "remotely")
        return invokeRemote(name, input, sync)
    }
}

/**
 * generates a trace id that encodes the current setup as well as a random part identifying a single execution flow
 */
function generateTraceId() {
    let fusionSetupPart = otherFunctions["traceName"]
    let memory = process.env["AWS_LAMBDA_FUNCTION_MEMORY_SIZE"]
    let randomTracePart = crypto.randomBytes(16).toString("hex")

    return `${fusionSetupPart}-${functionToHandle}-${memory}-${randomTracePart}`
}

/**
 * Unfortunately CloudWatch doesn't really sort message by their timestamp, so we must put the timestamp into every log message.
 * While we are at it, we might as well put the trace id in every message as well, just incase CloudWatch mucks up the ordering so bad that it looks like a log message belongs to another invocation
 */
function logRelevantMessage(type, content) {
    let fusionizeMagicString = "FSMSG"
    let relevantMessage = {
        traceId: currentTraceId,
        time: Date.now(),
        sourceFunction: functionToHandle,
        type: type,
        content: content,
    }
    console.log(fusionizeMagicString + JSON.stringify(relevantMessage))
}