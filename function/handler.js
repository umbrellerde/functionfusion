const handlers = {}

const https = require("https")

const fusionSetup = {
    A: {
        nextStep: ["B"],
        sync: false,
    },
    B: {
        appended: true,
        nextStep: ["C", "D"],
        sync: false,
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

exports.handler = async function (event) {
    // This root handler might be invoked sync or async - we don't really care. Maybe the response will fall into the void.
    console.log('Event: ', event)
    console.log('Env: ', process.env)

    // const [baseUrl, basePath] = getUrlsFromEnv()

    // see ExampleLog.md for possible invocation types
    // let [stepName, input] = getStepNameAndInputFromEvent(event)

    // let result = await invokeLocal(event, stepName, input)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputEvent: event,
            result: "result",
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
async function invokeRemote(step, data, sync=false) {
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
        console.time('reqstart')
        let req = https.request(options, (res) => {
            console.log("Request Success", res)
            resultData = ''
            res.on('data', (d) => {
                resultData += d
            })
            res.on('end', () => {
                resolve(JSON.parse(resultData))
            })
        })
        req.on('error', (e) => {
            console.log('Request Error', e)
            reject(e)
        })
        req.write(JSON.stringify(data))
        req.end()
        console.timeEnd('reqstart')
    })
}

async function invokeLocal(event, stepName, input) {

    // Invoke the function
    let currentHandler = getHandler(stepName)
    let result = currentHandler.handler(input)

    // See the next Steps and invoke them recursively

    let numFusions = fusionSetup[stepName].nextStep.length;

    for (let i = 0; i < numFusions; i++) {
        let nextStepName = fusionSetup[stepName].nextStep[i]
        let nextStep = fusionSetup[nextStepName]

        console.log(`Next Step is ${nextStepName}`)

        if (nextStep.appended) {
            console.log("This step should happen here! Calling it...")
            return invokeLocal(event, nextStepName, result)
        } else {
            console.log(`This step should happen remotely! Firing off a Request. NextStep=${nextStep}`)
            let remoteResult = await invokeRemote(event, nextStepName, result, nextStep.sync)
            console.log("Answer from the next Invocation: (HTTP 202 => async)")
            console.log(remoteResult)
            return remoteResult
        }
    }
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

function getUrlsFromEnv() {
    // set from terraform
    let env = process.env["stage_url"]
    let lastSlash = env.lastIndexOf("/")
    // everything before the last slash , everything after the last slash
    return [env.substring(0, lastSlash), env.substring(lastSlash + 1)]
}