const handlers = {}

const https = require("https")
const AWS = require("aws-sdk")
const crypto = require("crypto")

let basePath = ""
let baseUrl = ""
const functionToHandle = process.env["FUNCTION_TO_HANDLE"]
let fusionGroups = getFusionGroupsFromEnv()
let currentTraceId = null

exports.handler = async function (event) {
    // This root handler might be invoked sync or async - we don't really care. Maybe the response will fall into the void.

    // see ExampleLog.md for possible invocation types
    let input = getInputFromEvent(event)

    let firstStepInChain = false

    // If the traceId is generated here set firstStep to true
    if (!input.hasOwnProperty('traceId')) {
        let traceId = generateTraceId()
        input['traceId'] = traceId
        currentTraceId = traceId
        firstStepInChain = true
    } else {
        // Necessary if this (non-root) Function calls another function
        currentTraceId = input['traceId']
    }
    console.log("TraceId", input['traceId'])
    console.log("FirstStep", firstStepInChain)

    // Invoke the function with await be cause execution stops when this function returns
    let timeBase = Date.now()
    let result = await invokeLocal(functionToHandle, input, true)
    console.log("time-base", Date.now() - timeBase)

    console.log("Result", result)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            result: result,
            hello: "World"    
        }),
    }
}

/**
 * 
 * @param {*} event The original event to find the Base URL
 * @param {*} step  The next step to call - will be appended to base url
 * @param {*} data  The data to call the next function with
 */
async function invokeRemote(step, data, sync = false) {
    let timeRemote = Date.now()
    const [baseUrl, basePath] = await getUrlsFromEnv()
    return new Promise((resolve, reject) => {

        let invocationType = sync ? "SYNC-" : ""
        const options = {
            host: baseUrl,
            // onlyStage/SYNC-A to call A sync
            // onlyStage/A to call A async
            path: `/${basePath}/${invocationType}${step}`,
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
                    let json = JSON.parse(resultData)
                    console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
                    resolve(json)
                } else {
                    // Async Response is empty (it just has lots of headers and stuff...)
                    console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
                    resolve({})
                }
            })
        })
        req.on('error', (e) => {
            console.log('Request Error', e)
            console.log(`time-remote-${sync}-${functionToHandle}-${step}`, Date.now() - timeRemote)
            reject(e)
        })
        req.write(JSON.stringify(data))
        req.end()
    })
}

async function invokeLocal(stepName, input, sync) {
    let timeLocal = Date.now()
    let currentHandler = getHandler(stepName)
    let res = currentHandler.handler(input, callFunction)
    console.log(`time-local-${sync}-${functionToHandle}-${stepName}`, Date.now() - timeLocal)
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

async function getUrlsFromEnv() {
    if (basePath === "") {
        // TODO we should get this from somewhere else
        baseUrl = "onlyStage" //process.env["stage_name"]

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
    }
    return [basePath, baseUrl]
}

function getHandler(resource) {
    if (handlers[resource]) {
        return handlers[resource]
    }
    handlers[resource] = require(`./fusionables/${resource}/handler`)
    return handlers[resource]
}

function isInSameFusionGroup(thisName, otherName) {
    return fusionGroups.filter((e) => e.includes(thisName))[0].includes(otherName)
}

/**
 * 
 * @param {string} name the name of the function that should be called
 * @param {*} input input to pass to the function
 * @param {*} sync whether the response should be await-ed.
 * @returns (A Promise) containing the result, if sync is true. Otherwise returns a promise that contains something (either {} if the request was sent to another function or the result) that must be await-ed before the function ends, otherwise their execution may be finished prematurely
 */
function callFunction(name, input, sync) {
    input['traceId'] = currentTraceId
    if (isInSameFusionGroup(functionToHandle, name)) {
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
    // Elements within a group are joined by ".", between fusion groups there is a ","
    let fusionSetupPart = fusionGroups.map(e => e.join(".")).join(",")
    let randomTracePart = crypto.randomUUID({disableEntropyCache:true}).replaceAll("-", "")

    return `${fusionSetupPart}-${functionToHandle}-${randomTracePart}`
}

function getFusionGroupsFromEnv() {
    // result should be[["A", "B"], ["C"], ["D"]]
    // from A.B,C,D
    let str = process.env["FUSION_GROUPS"]
    let groups = str.split(",")
    let groupsSplitted = groups.map((e) => e.split("."))
    return groupsSplitted
}