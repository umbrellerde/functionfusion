const AWS = require("aws-sdk");
const { assert } = require("console");
const { config } = require("process");

AWS.config.update({ region: process.env["AWS_REGION"] })

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();

const bucketName = process.env["S3_BUCKET_NAME"]
const functionLogGroupNames = process.env["FUNCTION_NAMES"].split(",")
const configurationMetadataFName = process.env["CONFIGURATION_METADATA"]

const setupFromList = (list) => list.map(e => e.sort().join(".")).sort().join(",")
const listFromSetup = (setup) => setup.split(",").map(g => g.split("."))

// TODO completely rewrite this

exports.handler = async function (event) {

    let deleteStartInvocations = event["deleteSeconds"]

    // Get all .json Files from S3 ==> All Existing Fusion Setups
    let setupsTested = getAllSetups()
    let configurationMetadata = getConfigurationMetadata()

    // TODO is this an OK thing to do?
    // Delete the first three minutes of invocations

    setupsTested = await setupsTested
    if (deleteStartInvocations > 0) {
        let minTime = 2082668400000 // This is just here on purpose so that the code breaks in 2036
        for (let key of Object.keys(setupsTested)) {
            for (let i = 0; i < setupsTested[key].length; i++) {
                if (parseInt(setupsTested[key][i]["startTimestamp"]) < minTime) {
                    minTime = parseInt(setupsTested[key][i]["startTimestamp"])
                }
            }
        }
        console.log("Minimum found time: ", minTime)
        // Min allowed time is three minutes after the first invocation.
        let minAllowedTime = minTime + deleteStartInvocations * 1000
        console.log("Minimum allowed time: ", minAllowedTime)
        let deleted = 0
        for (let key of Object.keys(setupsTested)) {
            for (let i = 0; i < setupsTested[key].length; i++) {
                if (parseInt(setupsTested[key][i]["startTimestamp"]) < minAllowedTime) {
                    setupsTested[key].splice(i, 1)
                    deleted++
                }
            }
        }
        console.log("Deleted Elements:", deleted)
    }

    console.log("All Setups tested", setupsTested)
    configurationMetadata = await configurationMetadata
    console.log("Configuration Metadata is", configurationMetadata)

    let stillTryingNewConfigurations = true

    // Old Stragety - Try to improve iterativeky on median latency, try a new configuration if this fails
    // let newConfiguration = iterateOnLowestLatency(setupsTested, false)
    // 
    // if (newConfiguration == null) {
    //     newConfiguration = generateNewConfiguration(setupsTested)
    //     if (newConfiguration == null) {
    //         newConfiguration = getConfigurationWithLowestLatency(setupsTested)
    //         stillTryingNewConfigurations = false
    //     }
    // }


    // Strategy - Try to improve iteratively on median latency, try a new configuration otherwise
    let newConfiguration = iterateOnLowestLatency(setupsTested, false, configurationMetadata, getConfigurationWithLowestLatency)

    if (newConfiguration == null) {
        console.log("********************************************************************")
        console.log("Getting the currently best configuration")
        stillTryingNewConfigurations = false
        newConfiguration = getConfigurationWithLowestLatency(setupsTested)
    } else {
        console.log("Iterate on lowest Latency found something to do")
    }

    // Strategy - Try to improve iteratively on p99 latency
    // let newConfiguration = iterateOnLowestLatency(setupsTested, false, getConfigurationWithLowestColdStartLatency)

    // if (newConfiguration == null) {
    //     console.log("Getting Configuration with lowest Latency")
    //     stillTryingNewConfigurations = false
    //     newConfiguration = getConfigurationWithLowestColdStartLatency(setupsTested)
    // } else {
    //     console.log("Iterate on lowest Latency found something to do")
    // }


    // Strategy - Try Everything
    // let newConfiguration = generateNewConfiguration(setupsTested)
    // if (newConfiguration == null) {
    //     newConfiguration = getConfigurationWithLowestLatency(setupsTested)
    //     stillTryingNewConfigurations = false
    // }

    console.log("Done Testing Setups. New Configuration is", newConfiguration)

    await overwriteConfigurationMetadata(newConfiguration)
    // Sleep for s3 consistency...
    await new Promise(r => setTimeout(r, 2000));
    let optideployer = await lambda.invoke({
        FunctionName: "Optideployer"
    }).promise()
    
    console.log("AWS Answered", optideployer)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { setupsTested: setupsTested, newConfiguration: newConfiguration, optimumFound: !stillTryingNewConfigurations },
    }
}

// TODO Request Response Latency or Billed Duration???
function getConfigurationWithLowestColdStartLatency(setupsTested, requestResponseLatency = true) {
    console.log("GetConfigurationWithLowestColdStartLatency")
    function getp99(values) {
        if (values.length === 0) throw new Error("No inputs");

        values.sort(function (a, b) {
            return a - b;
        });

        var cutoff = Math.floor(values.length *0.99);
        return values[cutoff];
    }

    let p99 = {}
    for (let key of Object.keys(setupsTested)) {
        let relevantInvocations = []
        if (requestResponseLatency) {
            relevantInvocations = setupsTested[key].filter(inv => inv["isRootInvocation"]).map(inv => inv["billedDuration"])
        } else {
            relevantInvocations = setupsTested[key].map(inv => inv["billedDuration"])
        }
        p99[key] = getp99(relevantInvocations)
    }

    // medians["A.B.C"] = 25, etc...


    let [minKey, minValue] = ["", Number.MAX_SAFE_INTEGER]
    for (let key of Object.keys(p99)) {
        if (p99[key] < minValue) {
            minKey = key
            minValue = p99[key]
        }
    }
    console.log("Medians are: ", medians, "with minKey", minKey)
    return minKey
}

function getConfigurationWithLowestLatency(setupsTested, requestResponseLatency = true) {
    // Iterate over all Keys, get their content. Iterate over the Content and calculate the median billedDuration
    console.log("GetConfigurationWithLowestLatency")

    function median(values) {
        if (values.length === 0) throw new Error("No inputs");

        values.sort(function (a, b) {
            return a - b;
        });

        var half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];

        return (values[half - 1] + values[half]) / 2.0;
    }

    let medians = {}
    for (let key of Object.keys(setupsTested)) {
        let relevantInvocations = []
        if (requestResponseLatency) {
            relevantInvocations = setupsTested[key].filter(inv => inv["isRootInvocation"]).map(inv => inv["billedDuration"])
        } else {
            relevantInvocations = setupsTested[key].map(inv => inv["billedDuration"])
        }
        medians[key] = median(relevantInvocations)
    }

    // medians["A.B.C"] = 25, etc...


    let minKey = ""
    let minValue = Number.MAX_SAFE_INTEGER
    for (let key of Object.keys(medians)) {
        if (medians[key] < minValue) {
            minKey = key
            minValue = medians[key]
        }
    }
    console.log("Medians are: ", medians, "with minKey", minKey)
    return minKey
}

/**
 * {
      "A,B,C,D": [ // The name of the current fusion setup. Elements seperated with are dot are in the same fusion group, elements seperated with a "," are in different groups
        {
          "traceId": "f1940f9795747e2a",
          "fusionGroup": "A,B,C,D", // Fusion Setup, same as the name of the list this object is in
          "source": "A", // Where was the original invocatino from? In case of Root invocation, this is also the current function
          "currentFunction": "A", // What is the base function of the currently running function?
          "billedDuration": 2056, // Extracted from the Lambda Report
          "maxMemoryUsed": 80, // as reported by Lambda
          "isRootInvocation": true, // True if this is the invocation stat started a trace (==> First one to create the trace)
          "startTimestamp": 1645016691288, // Time from START to STOP according to Lambda
          "endTimestamp": 1645016693329,
          "internalDuration": 2030, // How long the base invokeLokal()-call took
          "calls": [
            {
              "called": "A",
              "caller": "A",
              "local": true, // Whether this call was fulfilled locally (according to fusion group)
              "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
              "time": 641 // how long the invoke Call took for the function that called it
            },...
        },...
      ],
      "A.B,C,D": [...
      ]
    }
 * @param {*} setupsTested the list described above
 * @returns {string} the new fusion setup that should be tested.
 */
function generateNewConfiguration(setupsTested) {
    // function-fusion-A ==> A, or function-fusion-A-256
    let functionNames = functionLogGroupNames.map(fn => fn.split("-")[2])

    let resultConfiguration = getNextPossibleConfiguration(setupsTested, functionNames)

    // Test for valid Result Configuration
    for (let fname of functionNames) {
        assert(resultConfiguration.includes(fname), "The new configuration must include all function names. " + resultConfiguration + " does not include", + fname)
    }
    return resultConfiguration
}

/**
 * For the exhaustive strategy: Given a list of all tested setups, generate a new untested setup
 * @param {*} setupsTested 
 * @param {*} functionNames 
 * @returns The setup string if a new one was found, null otherwise

function getNextPossibleConfiguration(setupsTested, functionNames) {

    // TODO get the configuration file to see all the tested setups and their configuration
    // change one little thing and then return this changed configuration
}
 */

const pairs = (arr) => arr.map( (v, i) => arr.slice(i + 1).map(w => [v, w]) ).flat();
function iterateOnLowestLatency(setupsTested, nullIfAlreadyTested = false, configurationMetadata = {}, functionToFindBase = getConfigurationWithLowestLatency) {
    let currentMin = functionToFindBase(setupsTested) // Key of the currently fastest setup.
    let currentMinConfiguration = configurationMetadata[currentMin]
    let functionNames = functionLogGroupNames.map(fn => fn.split("-")[2])
    // change something about this configuration smartly:
    // - Check if there are sync calls to functions that are currently remotely, or async calls that are local
    // - Change a SINGLE thing about the configuration and try it out.
    // ==> TODO build how the configuration should look like and check if it's different somewhere

    // Step 1: find the "fusion setup" that should be used (later on we'll figure out the sizes)
    let actualCallsConfiguration = {}
    for (let key of Object.keys(setupsTested)) {
        let invocationsList = setupsTested[key]
        for (let invocation of invocationsList) {
            let caller = invocation["currentFunction"]
            // This is a list of strings (==task name)
            let syncCallsList = invocation["calls"]
                .filter((call) => call["sync"] == true)
                .map((call) => call["called"])
            let asyncCallsList = invocation["calls"]
                .filter((call) => call["async"] == true)
                .map((call) => call["called"])
            // Init Object if it's null
            if (actualCallsConfiguration[caller] == null) {
                actualCallsConfiguration[caller] = {}
            }
            // For now, just count how often it's called sync/async
            for(let e of syncCallsList) {
                // Init Object if it's null
                if (actualCallsConfiguration[caller][e] == null) {
                    actualCallsConfiguration[caller][e] = {async: 0, sync: 1}
                } else {
                    actualCallsConfiguration[caller][e]["sync"] = actualCallsConfiguration[caller][e]["sync"] + 1
                }
            }         
            for(let e of asyncCallsList) {
                // Init Object if it's null
                if (actualCallsConfiguration[caller][e] == null) {
                    actualCallsConfiguration[caller][e] = {async: 1, sync: 0}
                } else {
                    actualCallsConfiguration[caller][e]["async"] = actualCallsConfiguration[caller][e]["async"] + 1
                }
            }       
        }
    }

    console.log("----- Done Setting up, now finding new optimums.")
    console.log("Actual Calls", actualCallsConfiguration)
    console.log("currentMin", currentMin)
    console.log("configurationMetadata", configurationMetadata)
    console.log("Current Min Configuration", currentMinConfiguration)
    // Compare currentMinConfiguration and actualCallsConfiguration to find possible improvements
    // Iterate over actualCalls and see whether the configuration is "optimal" (==local sync & remote async)
    for (let caller of Object.keys(actualCallsConfiguration)) {
        for (let called of Object.keys(actualCallsConfiguration[caller])) {
            console.log(`getting caller=${caller} called=${called} from`, currentMinConfiguration["rules"])
            let minConfig = currentMinConfiguration["rules"][caller][called]
            let actualCalls = actualCallsConfiguration[caller][called]
            // Are there async calls but the sync strategy is local?? Then move them!
            if (actualCalls["async"] != null && actualCalls["async"] > 10) { //10 is arbitrary, should be a percentage of total calls to signify importance
                if(minConfig["async"]["strategy"] === "local") {
                    // Oh nose, we found something to change! There are async calls, but the strategy for async calls is to call locally!
                    configurationMetadata[currentMin]["rules"][caller][called]["async"] = {
                        "strategy": "remote",
                        "url": called
                    }
                    console.log(`changing ${caller} to ${called} to be remote instead of local`)
                    return configurationMetadata
                }
            }
            // Same as above, but the other way around. With the initial setup of everything local this should never happen
            if (actualCalls["sync"] != null && actualCalls["sync"] > 10) {
                if(minConfig["async"]["strategy"] === "remote") {
                    // Oh nose, we found something to change! There are async calls, but the strategy for async calls is to call locally!
                    configurationMetadata[currentMin][caller][called]["sync"] = {
                        "strategy": "local"
                    }
                    console.log(`changing ${caller} to ${called} to be local instead of remote, which is really unlikely but still happened!`)
                    return configurationMetadata
                }
            }
        }
    }
    
    console.log("remote/async is already optimal - now on to memory sizes!")
    // TODO do some power tuning here!

    // There is nothing that can be fused from the current function
    return null
}

/**
 * 
 * @returns a map from all existing group setup names to their invocations.
 */
async function getAllSetups() {
    let objects = await s3.listObjects({
        Bucket: bucketName
    }).promise()

    // Get all Json File Names
    let fileNames = []
    for (let object of objects.Contents) {
        if (object.Key.includes(".json") && object.Key.includes("traces/")) {
            fileNames.push(object.Key)
        }
    }

    // Merge filenames and content into an object
    let groupMap = {}
    console.log("All files are", fileNames)
    for (let i = 0; i < fileNames.length; i++) {
        let fn = fileNames[i]
        let groupName = fn.replace(".json", "").replace("traces/", "")
        let content = await getFromBucket(bucketName, fn)

        // The content is a list of invocations - but in JSON its saved as an object with the key being the array index.
        let contentList = []
        for (const [key, value] of Object.entries(content)) {
            contentList.push(value)
        }
        groupMap[groupName] = contentList
    }

    return groupMap
}

/**
 * @returns Parsed JSON from the configuration metadata file in s3
 */
async function getConfigurationMetadata() {
    return getFromBucket(bucketName, configurationMetadataFName)
}

/**
 * Will overwrite the configuration metadata
 * @param {*} body will be turned into json
 */
async function overwriteConfigurationMetadata(body) {
    return s3.upload({
        Bucket: bucketName,
        Key: configurationMetadataFName,
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
        console.log("HeadBucket Returned Error", err)
        return {}
    }

    console.log("Downloading Object, Head is", head)

    let resp = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise()

    console.log("Get Bucket got response", resp)

    let json = JSON.parse(resp.Body.toString('utf-8'))
    return json
}