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
    console.log('Event: ', event)

    let stepName = event.resource.substring(1)
    let input = event.body

    await invokeLocal(event, stepName, input)

    console.log("Function Setup:", fusionSetup)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            originalEvent: event,
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
async function invokeRemote(event, step, data, sync=false) {
    return new Promise((resolve, reject) => {

        let invocationType = sync ? "RequestResponse" : "Event"

        const options = {
            host: event.headers.Host,
            path: `/${event.requestContext.stage}/${step}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Amz-Invocation-Type': invocationType,
            }
        }
        console.log("Sending Request:", options)
        console.time('reqstart')
        let req = https.request(options, (res) => {
            console.log("Request Success", res)
            data = ''
            res.on('data', (d) => {
                data += d
            })
            res.on('end', () => {
                resolve(JSON.parse(data))
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
            await invokeLocal(event, nextStepName, result)
        } else {
            console.log("This step should happen remotely! Firing off a Request.")
            let remoteResult = await invokeRemote(event, nextStepName, result)
            console.log("Was the request sent?")
            console.log(remoteResult)
        }
    }
}