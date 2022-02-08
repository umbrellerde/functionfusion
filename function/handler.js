const handlers = {}
const fusionSetup = {
    A: {
        nextStep: ["B"],
        sync: false,
    },
    B: {
        appended: true,
        nextStep: ["C", "D"],
        sync: true,
    },
    C: {
        appended: false,
        nextStep: [],
        sync: false,
    },
    D: {
        appended: false,
        nextStep: [],
        sync: false,
    }
}

const https = require("https")
const AWS = require("aws-sdk")

let basePath = ""
let baseUrl = ""

exports.handler = async function (event) {
    // This root handler might be invoked sync or async - we don't really care. Maybe the response will fall into the void.
    console.log('Event: ', event)
    console.log('Env: ', process.env)

    // see ExampleLog.md for possible invocation types
    let [stepName, input] = getStepNameAndInputFromEvent(event)

    let result = await invokeLocal(stepName, input)

    console.log("Result is: ", result)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputEvent: event,
            result: result,
            environ: process.env,
        }),
    }
}

function getHandler(resource) {
    if (handlers[resource]) {
        return handlers[resource]
    }
    handlers[resource] = require(`./fusionables/${resource}/handler`)
    return handlers[resource]
}

/**
 * 
 * @param {*} event The original event to find the Base URL
 * @param {*} step  The next step to call - will be appended to base url
 * @param {*} data  The data to call the next function with
 */
async function invokeRemote(step, data, sync = false) {
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
            console.log("Request Success", res)
            resultData = ''
            res.on('data', (d) => {
                resultData += d
            })
            res.on('end', () => {
                console.log("Got Result: ", resultData)
                if (sync) {
                    let json = JSON.parse(resultData)
                    console.log("Sync Response is: ", json.result)
                    resolve(json.result)
                } else {
                    // Async Response is empty (it just has lots of headers and stuff...)
                    resolve({})
                }
            })
        })
        req.on('error', (e) => {
            console.log('Request Error', e)
            reject(e)
        })
        req.write(JSON.stringify(data))
        req.end()
    })
}

async function invokeLocal(stepName, input, toReturn = {}) {

    // Invoke the function
    let currentHandler = getHandler(stepName)
    let result = currentHandler.handler(input)
    toReturn[stepName] = result

    // See the next Steps and invoke them recursively

    let numFusions = fusionSetup[stepName].nextStep.length;

    for (let i = 0; i < numFusions; i++) {
        let nextStepName = fusionSetup[stepName].nextStep[i]
        let nextStep = fusionSetup[nextStepName]

        console.log(`Next Step is ${nextStepName}`)

        if (nextStep.appended) {
            console.log("This step should happen here! Calling it...")
            return await invokeLocal(nextStepName, toReturn, toReturn)
        } else {
            console.log(`This step should happen remotely! Firing off a Request. NextStep=${nextStepName}`)
            let remoteResult = await invokeRemote(nextStepName, toReturn, nextStep.sync)
            toReturn[nextStepName] = remoteResult
        }
    }

    return toReturn
}

function getStepNameAndInputFromEvent(event) {
    // set from terraform
    let name = process.env["function_to_handle"]

    // If the event has the property requestContext we assume its a (sync) HTTP request
    if (event.requestContext) {
        return [name, event.body]
    } else {
        return [name, event]
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