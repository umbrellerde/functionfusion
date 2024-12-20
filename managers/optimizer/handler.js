const AWS = require("aws-sdk");
const { assert, trace } = require("console");
const { config } = require("process");

AWS.config.update({ region: process.env["AWS_REGION"] })

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();

const bucketName = process.env["S3_BUCKET_NAME"]
const functionLogGroupNames = process.env["FUNCTION_NAMES"].split(",")
const configurationMetadataFName = process.env["CONFIGURATION_METADATA"]
const allDeployedMemorySizes = process.env["FUNCTION_POSSIBLE_MEM_SIZES"].split(",").map(el => parseInt(el)).sort((a, b) => a - b)

const setupFromList = (list) => list.map(e => e.sort().join(".")).sort().join(",")
const listFromSetup = (setup) => setup.split(",").map(g => g.split("."))

exports.handler = async function (event) {

    let deleteStartInvocations = event["deleteSeconds"] || -1

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
    let newConfiguration = iterateOnLowestLatency(setupsTested, true, configurationMetadata, getConfigurationLastUsed)

    if (newConfiguration == null) {
        console.log("********************************************************************")
        console.log("Getting the currently best configuration and adding a copy of it at the bottom of configuration metadata...")
        stillTryingNewConfigurations = false
        currentMinKey = getConfigurationWithLowestLatency(setupsTested)
        let newDate = Math.floor(Date.now() / 1000)
        configurationMetadata[newDate] = JSON.parse(JSON.stringify(configurationMetadata[currentMinKey]))
        configurationMetadata[newDate]["traceName"] = newDate
        newConfiguration = configurationMetadata
    } else {
        console.log("Iterate (on last configuration or latency?) found something to do")
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
        FunctionName: "optideployer"
    }).promise()

    console.log("AWS Answered", optideployer)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { optimumFound: !stillTryingNewConfigurations }, //setupsTested: setupsTested, newConfiguration: newConfiguration,
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

        var cutoff = Math.floor(values.length * 0.99);
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
 * 
 * @param {} setupsTested 
 * @returns the setup with the highest key, which is the setup that was deployed by the optideployer most recently 
 */
function getConfigurationLastUsed(setupsTested) {
    return Object.keys(setupsTested).sort().slice(-1)[0]
}

/**
 * helper method for power tuning
 */
let changeMemorySizeOfFunction = (fname, mem, configurationMetadata, newTimestamp, currentMin) => {
    console.log(`function ${fname} should have memory ${mem}`)

    // TODO check if newTimestamp already exists, if yes just mutate it.
    if (!Object.keys(configurationMetadata).includes(newTimestamp.toString())) {
        configurationMetadata[newTimestamp] = JSON.parse(JSON.stringify(configurationMetadata[currentMin]))
        configurationMetadata[newTimestamp]["traceName"] = newTimestamp   
    } else {
        console.log("changing memory size of already existing new setup")
    }

    for (let caller of Object.keys(configurationMetadata[newTimestamp]["rules"])) {
        if (configurationMetadata[newTimestamp]["rules"][caller][fname]["async"]["strategy"] === "remote") {
            configurationMetadata[newTimestamp]["rules"][caller][fname]["async"]["url"] = fname + "-" + mem
        }
        if (configurationMetadata[newTimestamp]["rules"][caller][fname]["sync"]["strategy"] === "remote") {
            configurationMetadata[newTimestamp]["rules"][caller][fname]["sync"]["url"] = "SYNC-" + fname + "-" + mem
        }
    }
    return configurationMetadata
}

/**
 * setupsTested:
 * {
      "A,B,C,D": [ // The name of the current fusion setup. Elements seperated with are dot are in the same fusion group, elements seperated with a "," are in different groups
        {
          "traceId": "f1940f9795747e2a",
          "fusionGroup": "A,B,C,D", // Fusion Setup, same as the name of the list this object is in
          "source": "A", // Where was the original invocatino from? In case of Root invocation, this is also the current function
          "currentFunction": "A", // What is the base function of the currently running task?
          "billedDuration": 2056, // Extracted from the Lambda Report
          "memoryAvail": 128 // Extracted from Env Variable
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

    configurationMetadata: see one of the configurationmetadata.json's
 */
function iterateOnLowestLatency(setupsTested, nullIfAlreadyTested = false, configurationMetadata = {}, functionToFindBase = getConfigurationWithLowestLatency) {
    let currentMin = functionToFindBase(setupsTested) // Key of the currently fastest setup // the last setup that was used.
    let currentMinConfiguration = configurationMetadata[currentMin]
    let functionNames = functionLogGroupNames.map(fn => fn.split("-")[2])

    console.log("Current Min Configuration is", currentMin)
    // change something about this configuration smartly:
    // - Check if there are sync calls to functions that are currently remotely, or async calls that are local
    // - Change a SINGLE thing about the configuration and try it out.
    // ==> TODO build how the configuration should look like and check if it's different somewhere

    // Step 1: find the "fusion setup" that should be used (later on we'll figure out the sizes)
    // ...and only use the invocations from the setup that was last tested.... Because that makes it way easier....
    let actualCallsConfiguration = {}
    let invocationsList = setupsTested[currentMin]
    for (let invocation of invocationsList) {
        let caller = invocation["currentFunction"]
        // This is a list of strings (==task name)
        let syncCallsList = invocation["calls"]
            .filter((call) => call["caller"] == caller) // ?? only get invocations that actually were called by the original task of this function. IDK whether thats a good idea
            .filter((call) => call["sync"] == true)
            .map((call) => call["called"])
        let asyncCallsList = invocation["calls"]
            .filter((call) => call["caller"] == caller) // ?? only get invocations that actually were called by the original task of this function. IDK whether thats a good idea
            .filter((call) => call["sync"] == false)
            .map((call) => call["called"])
        // Init Object if it's null
        actualCallsConfiguration[caller] = actualCallsConfiguration[caller] || {}
        // For now, just count how often it's called sync/async
        for (let e of syncCallsList) {
            // Init Object if it's null
            if (actualCallsConfiguration[caller][e] == null) {
                actualCallsConfiguration[caller][e] = { async: 0, sync: 1 }
            } else {
                actualCallsConfiguration[caller][e]["sync"] = actualCallsConfiguration[caller][e]["sync"] + 1
            }
        }
        for (let e of asyncCallsList) {
            // Init Object if it's null
            if (actualCallsConfiguration[caller][e] == null) {
                actualCallsConfiguration[caller][e] = { async: 1, sync: 0 }
            } else {
                actualCallsConfiguration[caller][e]["async"] = actualCallsConfiguration[caller][e]["async"] + 1
            }
        }
    }


    console.log("----- Done Setting up, now finding new optimums.")
    console.log("Actual Calls", actualCallsConfiguration)
    console.log("currentMin", currentMin)
    //console.log("configurationMetadata", configurationMetadata)
    //console.log("Current Min Configuration", currentMinConfiguration)
    // The new key in the configuration metadata if we find one
    let newTimestamp = Math.floor(Date.now() / 1000)
    // Compare currentMinConfiguration and actualCallsConfiguration to find possible improvements
    // Iterate over actualCalls and see whether the configuration is "optimal" (==local sync & remote async)
    // Sort alphabetically for better optimization performance
    for (let caller of Object.keys(actualCallsConfiguration).sort()) {
        for (let called of Object.keys(actualCallsConfiguration[caller]).sort()) {

            if(caller === called) {
                // We don't need to optimize "calls to self", there is always a single call to self
                continue
            }

            let minConfig = currentMinConfiguration["rules"][caller][called]
            let actualCalls = actualCallsConfiguration[caller][called]

            console.log(`getting caller=${caller} called=${called} with actual calls=${actualCalls}`)

            // IMPORTANT If there are any sync calls - ignore that there are also async calls because we want the sync call to take precedent
            if (actualCalls["sync"] != null && actualCalls["sync"] > 0) {
                if (actualCalls["async"] != null && actualCalls["async"] > 0) {
                    console.log("There are synchronous and async calls - acting like there are only sync calls to make sure the task stays local")
                    actualCalls["async"] = null
                }
            }
            // Are there async calls but the sync strategy is local?? Then move them!
            if (actualCalls["async"] != null && actualCalls["async"] > 0) { //0 is arbitrary, should be a percentage of total calls to signify importance
                if (minConfig["async"]["strategy"] === "local") {
                    // TODO do we need to test whether this was already tested? No, because if there are any of these calls we want to change that!
                    // Oh nose, we found something to change! There are async calls, but the strategy for async calls is to call locally!
                    configurationMetadata[newTimestamp] = JSON.parse(JSON.stringify(configurationMetadata[currentMin]))
                    configurationMetadata[newTimestamp]["traceName"] = newTimestamp
                    configurationMetadata[newTimestamp]["rules"][caller][called]["async"] = {
                        "strategy": "remote",
                        "url": called
                    }

                    configurationMetadata[newTimestamp]["traceName"] = newTimestamp
                    console.log(`changing ${caller} to ${called} to be remote instead of local?`)
                    return configurationMetadata
                }
            }
            // Same as above, but the other way around. With the initial setup of everything local this should never happen
            if (actualCalls["sync"] != null && actualCalls["sync"] > 0) {
                if (minConfig["sync"]["strategy"] === "remote") {
                    // Oh nose, we found something to change! There are async calls, but the strategy for async calls is to call locally!
                    configurationMetadata[newTimestamp] = JSON.parse(JSON.stringify(configurationMetadata[currentMin]))
                    configurationMetadata[newTimestamp]["traceName"] = newTimestamp
                    configurationMetadata[newTimestamp]["rules"][caller][called]["sync"] = {
                        "strategy": "local"
                    }
                    configurationMetadata[newTimestamp]["traceName"] = newTimestamp
                    console.log(`changing ${caller} to ${called} to be local instead of remote!`)
                    return configurationMetadata
                }
            }
        }
    }

    // None of the return statements above were called, thats why we are here
    console.log("remote/async is already optimal - now on to memory sizes!")
    // do some power tuning here!

    // There are some configurations that use the same remote/async stuff but use different memory sizes - maybe there are some untested ones
    // So: Figure out all the configs that are "comparable" to the current optimum, and try to find whether there is an untested function size that might be faster
    // (i.e. every function size that is either one size smaller or one size bigger than the current fastest function size and not tested yet)
    let comparableConfigurationKeys = new Set()
    comparableConfigurationKeys.add(currentMinConfiguration["traceName"])
    let currentOptimalRules = currentMinConfiguration["rules"]
    // Compare all setups and get a list that use the same configuration as the currently fastest (but with other memory sizes)
    // TODO this could return on every change - but the memory sizes of async functions should't influence each other (because the prev. optimizer made it all async==remote) - so just do it all at once. Might be better to test single steps later on?
    for (let possibleConfigurationKey of Object.keys(configurationMetadata)) {
        let possibleRules = configurationMetadata[possibleConfigurationKey]["rules"]
        let isComparable = true // Will be set to false in this nested loop
        for (let i = 0; i < Object.keys(possibleRules).length; i++) {
            let fromKey = Object.keys(possibleRules)[i]
            for (let j = 0; j < Object.keys(possibleRules[fromKey]).length; j++) {
                let toKey = Object.keys(possibleRules[fromKey])[j]
                let syncAsyncList = Object.keys(possibleRules[fromKey][toKey])
                for (let k = 0; k < syncAsyncList.length; k++) {
                    let syncAsync = syncAsyncList[k]
                    /*
                    possibleRule looks something like this:
                    "async": {
                        "strategy": "remote",
                        "url": "AS"
                    },
                    "sync": {
                        "strategy": "remote",
                        "url": "SYNC-AS"
                    }
                    lets see if it's remote/local strategies align with the current optimal one
                    if yes, good. If no, break
                    */
                    let possibleRule = possibleRules[fromKey][toKey][syncAsync]
                    let optimalRule = currentOptimalRules[fromKey][toKey][syncAsync]
                    let sameStrategies = possibleRule["strategy"] === optimalRule["strategy"]
                    if (!sameStrategies) {
                        isComparable = false
                        j = k = Number.MAX_SAFE_INTEGER - 1 // Try it with the next possible rule = exit j and k inner loop
                    }
                }
            }
        }
        // Back in the loop that goes over every configuration
        // We are here because the !sameStrageties never triggered, in which case isComparable is True, or because it triggered, then its false
        if (isComparable) {
            comparableConfigurationKeys.add(configurationMetadata[possibleConfigurationKey]["traceName"])
        }
    }
    // Now the comparableConfigurationKeys contains all comparable keys
    // Go through all comparable invocations and add their invocations to a new data structure
    /*
    let memorySizeSpeeds = {
        "A" : {
            128: [1,2,3,4,5]
        }
    }
    */
    let memorySizeSpeeds = {}
    let maxMemoryUsage = {}
    comparableConfigurationKeys.forEach(key => {
        console.log("comparable key found", key)
        let currentConfig = configurationMetadata[key]
        let traceName = currentConfig["traceName"]
        console.log("traceName", traceName)
        let fromThisSetup = setupsTested[traceName]
        console.log("FromThisSetup is", fromThisSetup)
        for (let i = 0; fromThisSetup && i < fromThisSetup.length; i++) {
            let currentFunction = fromThisSetup[i]["currentFunction"]
            let currentMemory = fromThisSetup[i]["memoryAvail"]
            let currentTime = fromThisSetup[i]["internalDuration"]
            let maxMemoryUsed = fromThisSetup[i]["maxMemoryUsed"]

            // insert the new datum into the data structure described above
            memorySizeSpeeds[currentFunction] = memorySizeSpeeds[currentFunction] || {}
            memorySizeSpeeds[currentFunction][currentMemory] = memorySizeSpeeds[currentFunction][currentMemory] || []
            memorySizeSpeeds[currentFunction][currentMemory].push(currentTime)

            // This is the max of current and new value. Its longer than necessary
            maxMemoryUsage[currentFunction] = maxMemoryUsage[currentFunction] ? Math.max(maxMemoryUsage[currentFunction], maxMemoryUsed) : maxMemoryUsed
        }
    })

    console.log("memorySizeSpeeds")
    console.log(memorySizeSpeeds)
    console.log("maxMemoryUsage")
    console.log(maxMemoryUsage)

    const arrayAverage = array => array.reduce((a, b) => a + b) / array.length

    const dollarPerMs = memSize => 0.0000166667 * memSize * 0.000001 // Empirically Validated.

    let memorySizesHaveChanged = false
    for (let fname of Object.keys(memorySizeSpeeds)) {
        console.log("Currently testing function", fname)
        let averagePrice = {}
        for (let memSize of Object.keys(memorySizeSpeeds[fname])) {
            let average = arrayAverage(memorySizeSpeeds[fname][memSize])
            averagePrice[memSize] = average * dollarPerMs(parseInt(memSize))
        }
        // TODO make average Price use the median price??? Its working correctly for the average price
        let smallestKey = parseInt(Object.keys(averagePrice).reduce((a, b) => averagePrice[a] < averagePrice[b] ? a : b))
        console.log("Cheapest Memory Size is ", smallestKey, "for function", fname, ". All average prices are")
        console.log(averagePrice)

        let thisFunctionNeedsToTestNewMemorySizes = false
        for(let i = 0; i < allDeployedMemorySizes.length; i++) {
            // Check if this memory size was already deployed
            // If not deploy it.
            console.log("Testing memory size", allDeployedMemorySizes[i], "for function", fname)
            if(!Object.keys(memorySizeSpeeds[fname]).includes("" + allDeployedMemorySizes[i])) {
                // This size has not been tested yet
                configurationMetadata = changeMemorySizeOfFunction(fname, allDeployedMemorySizes[i], configurationMetadata, newTimestamp, currentMin)
                memorySizesHaveChanged = true
                thisFunctionNeedsToTestNewMemorySizes = true
                break // Dont need to change any other memory sizes
            }
        }

        if(!thisFunctionNeedsToTestNewMemorySizes) {
            // All deployed memory sizes have been tested
            // Check if the currently deployed memory size is also the cheapest. If yes, fine. If no, change deployment to the cheapest function
            console.log("All memory sizes have been tested")
            let selfUrl = currentMinConfiguration["rules"][fname][fname]["async"]["url"]
            // TODO need to do something better here. Check any call that has a memory size and see where it leads to?
            let selfCallUrlContainsMemSize = selfUrl && selfUrl.endsWith("" + smallestKey)
            if(!selfCallUrlContainsMemSize) {
                console.log("Switching to optimal memory size", smallestKey)
                // Change the setup to this memory size
                configurationMetadata = changeMemorySizeOfFunction(fname, smallestKey, configurationMetadata, newTimestamp, currentMin)
                memorySizesHaveChanged = true
            } else {
                console.log(currentMinConfiguration["rules"][fname][fname]["async"]["url"], "ends with", smallestKey, ", so its already optimal")
            }
        }

        // Check if the next biggest or next smallest memory size was already tested.
        //let currentIndex = allDeployedMemorySizes.findIndex(el => el == smallestKey)

        // if (allDeployedMemorySizes.length > (currentIndex + 1) && !Object.keys(memorySizeSpeeds[fname]).includes("" + allDeployedMemorySizes[currentIndex + 1])) {
        //     // Bigger hasnt been tested yet
        //     // update configurationMetadata with new Timestamp and new rules as above
        //     console.log("Testing the next biggest memory Size", allDeployedMemorySizes[currentIndex + 1])
        //     configurationMetadata = changeMemorySizeOfFunction(fname, allDeployedMemorySizes[currentIndex + 1], configurationMetadata, newTimestamp, currentMin)
        //     //return configurationMetadata //TODO change only a single thing == return here, if we want to do it all at once don't return
        //     memorySizesHaveChanged = true
        // } else if (
        //     currentIndex > 0 &&
        //     !Object.keys(memorySizeSpeeds[fname]).includes("" + allDeployedMemorySizes[currentIndex - 1]) &&
        //     allDeployedMemorySizes[currentIndex - 1] > maxMemoryUsage[fname]) { // The new memory size should be bigger than the minimum required memory size...
        //     // TODO test whether memory used was smaller than smallest tested size
        //     // Smaller hasnt been tested yet
        //     console.log("Testing the next smaller memory Size", allDeployedMemorySizes[currentIndex - 1])
        //     configurationMetadata = changeMemorySizeOfFunction(fname, allDeployedMemorySizes[currentIndex - 1], configurationMetadata, newTimestamp, currentMin)
        //     //return configurationMetadata //TODO change only a single thing == return here, if we want to do it all at once don't return
        //     memorySizesHaveChanged = true
        // } else {
        //     // both have been tested, so change nothing here
        //     console.log("Both Memory sizes have already been tested (or this is the edge case memory size)")
        // }
    }

    if (memorySizesHaveChanged) { // Power tuning found multiple things to do
        return configurationMetadata
    }

    // Build a map of memorys-size-to-performance for every root invocation
    console.log("Nothing has changed!")

    // There is nothing that can be improved from the current function
    if (nullIfAlreadyTested) {
        return null
    } else {
        return configurationMetadata
    }
}

/**
 * 
 * @returns a map from all existing group setup names to their invocations.
 */
async function getAllSetups() {
    let objects = await s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: "traces/"
    }).promise()

    console.log("All possible setups are", objects)

    // Get all Json File Names
    let fileNames = []
    for (let object of objects.Contents) {
        if (object.Key.includes(".json")) {
            fileNames.push(object.Key)
        } else {
            console.log("Ignoring Key", object)
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