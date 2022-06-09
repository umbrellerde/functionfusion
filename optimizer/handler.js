const AWS = require("aws-sdk");
const { assert } = require("console");

AWS.config.update({ region: process.env["AWS_REGION"] })

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();

const bucketName = process.env["S3_BUCKET_NAME"]
const functionLogGroupNames = process.env["FUNCTION_NAMES"].split(",")

const setupFromList = (list) => list.map(e => e.sort().join(".")).sort().join(",")
const listFromSetup = (setup) => setup.split(",").map(g => g.split("."))

exports.handler = async function (event) {

    let deleteStartInvocations = event["deleteSeconds"]

    // Get all .json Files from S3 ==> All Existing Fusion Setups
    let setupsTested = await getAllSetups()

    // TODO is this an OK thing to do?
    // Delete the first three minutes of invocations

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
    let newConfiguration = iterateOnLowestLatency(setupsTested, false, getConfigurationWithLowestLatency)

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

    // Update the Env Variables of all Functions
    let promises = []
    // fname=fusion-function-A ==> Function to handle is part after last "-"
    for (let fname of functionLogGroupNames) {
        let currentConfiguration = await lambda.getFunctionConfiguration({
            FunctionName: fname
        }).promise()
        console.log("Old Function Configuration", currentConfiguration)
        let newEnv = currentConfiguration["Environment"]["Variables"]
        newEnv["FUSION_SETUPS"] = JSON.stringify({TODO: true})
        newEnv["FUSION_GROUPS"] = newConfiguration
        console.log("New Configuration to be pushed", newEnv)
        let promise = lambda.updateFunctionConfiguration({
            FunctionName: fname,
            Environment: {
                Variables: newEnv
            }
        }).promise()
        promises.push(promise)
    }

    let result = await Promise.all(promises)
    console.log("AWS Answered", result)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { setupsTested: setupsTested, newConfiguration: listFromSetup(newConfiguration), optimumFound: !stillTryingNewConfigurations },
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
    // function-fusion-A ==> A
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
 */
function getNextPossibleConfiguration(setupsTested, functionNames) {
    let alreadyTested = (setup) => Object.keys(setupsTested).includes(setup)

    // https://stackoverflow.com/questions/42773836
    function* subsets(array, offset = 0) {
        while (offset < array.length) {
            let first = array[offset++];
            for (let subset of subsets(array, offset)) {
                subset.push(first);
                yield subset;
            }
        }
        yield [];
    }

    /**
     * 
     * @param {*} deiniteGroups a list of lists with the set groups
     * @param {*} ungrouped a list of functions that still need to be grouped
     */
    function tryAllCombinations(definiteGroups, ungrouped) {
        console.log("Trying definite, upgrouped: ", definiteGroups, ungrouped)
        for (let subset of subsets(ungrouped)) {
            console.log("...subset", subset)
            if (subset.length == 0) {
                console.log("Skipping since subset is empty")
                continue
            }

            let restUngrouped = ungrouped.filter((name) => !subset.includes(name))
            let newDefiniteGroups = definiteGroups.slice()
            newDefiniteGroups.push(subset)

            if (restUngrouped.length == 0) {
                // All elements have been grouped
                // console.log("Testing definite Group:", newDefiniteGroups)
                // console.log("Setup is:", setupFromList(newDefiniteGroups))
                // console.log("AlreadyTested", alreadyTested(setupFromList(newDefiniteGroups)))
                // console.log("(Currently trying definite)", definiteGroups)
                // console.log("(Current Subset)", subset)
                if (!alreadyTested(setupFromList(newDefiniteGroups))) {
                    return newDefiniteGroups
                }
            } else {
                let subcombinations = tryAllCombinations(newDefiniteGroups, restUngrouped)
                if (subcombinations != null) {
                    return subcombinations
                }
                // There are no subcombinations
                // Continue trying
            }
        }
        console.log("I have found nothing an i am all out of ideas")
        return null
    }
    return setupFromList(tryAllCombinations([], functionNames))
}

const pairs = (arr) => arr.map( (v, i) => arr.slice(i + 1).map(w => [v, w]) ).flat();
function iterateOnLowestLatency(setupsTested, nullIfAlreadyTested = false, functionToFindBase = getConfigurationWithLowestLatency) {
    let currentMin = functionToFindBase(setupsTested)
    let currentOptimalSetup = listFromSetup(currentMin)
    console.log("Current Optimal Setup is:", currentOptimalSetup)
    // change something about this configuration smartly:
    // - Check if there are sync calls to functions that are not fused yet.
    // - Change a SINGLE thing about the configuration and try it out.

    // Get a Set of Sets where every inside set are all the functions that sync-call each other
    let syncCalls = new Set()
    // Initialize the Set so that initially every function is inside its own syncSet
    let functionNames = functionLogGroupNames.map(fn => fn.split("-")[2])
    functionNames.forEach(fname => syncCalls.add(new Set([fname])))

    // Go over all Invocations and merge the sets that call each other
    for (let key of Object.keys(setupsTested)) {
        let invocationsList = setupsTested[key]
        for (let invocation of invocationsList) {
            // This is a List of Functions that should be in the same fusion group
            let syncCallsList = invocation["calls"]
                .filter((call) => call["sync"] == true)
                .map((call) => call["called"])
            // Go over every pair of sync calls and check if they are already in the same sync set
            pairs(syncCallsList).forEach(pair => {
                // pair[0] and pair[1] are the functions that should be together
                let firstSet = [...syncCalls].find(set => set.has(pair[0]))
                let alreadySync = firstSet.has(pair[1])
                if (!alreadySync) {
                    let secondSet = [...syncCalls].find(set => set.has(pair[1]))
                    syncCalls.delete(secondSet);
                    [...secondSet].forEach(item => firstSet.add(item))
                }
            })
        }
    }

    console.log("----- Done Setting up, now finding new optimums.")
    console.log("syncCalls", syncCalls)
    // Compare setup and syncCalls to find possible improvements
    for (let i = 0; i < currentOptimalSetup.length; i++) {
        let fusionGroup = currentOptimalSetup[i]
        for (let fktn of fusionGroup) {

            //----------------------------------------------
            // Check if there are any functions that are in a sync set with a function that does not get called at all.
            let fktnGroup = currentOptimalSetup.find(it => it.includes(fktn))
            let fktnSyncSet = [...syncCalls].find(it => it.has(fktn))
            for (let j = fktnGroup.length - 1; j >= 0; j--) {
                let fktnInGroup = fktnGroup[j]
                if (!fktnSyncSet.has(fktnInGroup)) {
                    //console.log(fktnInGroup, "should not be in the same fusionGroup as", fktn)
                    let i = currentOptimalSetup.findIndex(it => it.includes(fktn))
                    let newSetup = [...currentOptimalSetup]
                    newSetup[i] = fktnGroup.filter(item => item !== fktnInGroup)
                    newSetup.push([fktnInGroup])
                    //console.log("new Optimal Setup", setupFromList(newSetup))

                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(newSetup))
                    if (nullIfAlreadyTested && alreadyTested) {
                        //console.log("Returning Null because it has already been tested")
                        return null

                    }

                    if (!alreadyTested) {
                        return setupFromList(newSetup)
                    } else {
                        //console.log("...was already")
                    }
                } else {
                    //console.log("Function Sync Set contains function", fktnInGroup)
                }
            }

            // -------------------------------------
            // Create a new Set from an Array that is filtered, the array consists of the old set. Not very fast, but ES6 has no Filter() on Sets.
            // Get the Sync Set that has the function in it
            let syncSet = [...syncCalls].find(s => s.has(fktn))
            if (syncSet === undefined) {
                // The function was not called, ignore it
                //console.log("Skipping uncalled function", fktn)
                continue
            }
            let syncSetAsArray = [...syncSet]
            for (let j = 0; j < syncSetAsArray.length; j++) {
                let shouldBeSync = syncSetAsArray[j]
                //console.log("Trying whether", shouldBeSync, "is already in fusion group", fusionGroup)
                //console.log("Shouldbesync type:", typeof shouldBeSync)
                if (!fusionGroup.includes(shouldBeSync)) {
                    //console.log("!!! Found one! FusionGroup", fusionGroup, "does not include", shouldBeSync, "!")
                    //console.log("Old Optimal Setup: ", currentOptimalSetup)
                    // Found one! shouldBeSync should be in Fusion group, but its not.
                    // Remove shouldBeSync from other fusion group
                    for (let k = 0; k < currentOptimalSetup.length; k++) {
                        // Get the fusion group without the Item to be removed
                        let newGroup = currentOptimalSetup[k].filter(item => item !== shouldBeSync)
                        //console.log("Current Group", currentOptimalSetup[k], "filtered down to", newGroup)
                        if (newGroup.length == 0) {
                            //console.log("...Removing it")
                            // The group without the item is empty==> Remote it fully
                            // The Fusion Group is gone now, remove this element
                            currentOptimalSetup.splice(k, 1)
                        } else {
                            currentOptimalSetup[k] = newGroup
                        }
                    }
                    // Add to current fusion group
                    currentOptimalSetup[i].push(shouldBeSync)
                    //console.log("New Optimal Setup: ", currentOptimalSetup)

                    // Was this setup already tested?
                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(currentOptimalSetup))

                    if (alreadyTested) {
                        // The iteration on the current lowest latency was already tested...
                        //console.log("New Optimum has already been tested...")

                        if (nullIfAlreadyTested) {
                            return null
                        }

                        continue
                    }

                    return setupFromList(currentOptimalSetup)
                } else {
                    //console.log("...It is already...")
                }
            }
            //----------------------------------------------
            // Done merging stuff to make it faster
            // Now: Try to move stuff that is async in different functions.
            let notSyncSet = [...syncCalls].find(s => !s.has(fktn))
            console.log("Not Sync Set is", notSyncSet)
            let notSyncSetAsArray = [...notSyncSet]
            for (let j = 0; j < notSyncSetAsArray.length; j++) {
                let shouldNotBeSync = notSyncSetAsArray[j]
                //console.log("Trying whether", shouldNotBeSync, "is wrongly in fusion group", fusionGroup)
                if (fusionGroup.includes(shouldNotBeSync)) {
                    //console.log("!!! Found one! FusionGroup", fusionGroup, "includes", shouldNotBeSync, ", but shouldn't!")
                    //console.log("Old Optimal Setup: ", currentOptimalSetup)
                    // Found one! shouldNotBeSync should NOT be in Fusion group, but it is.
                    // Remote shouldNotBeSync from the fusion group
                    for (let k = 0; k < currentOptimalSetup.length; k++) {
                        let newGroup = currentOptimalSetup[k].filter(item => item !== shouldNotBeSync)
                        if (newGroup.length == 0) {
                            // The Fusion Group is gone now, remove this element
                            currentOptimalSetup.splice(k, 1)
                            k-- // Do the group with the new index k again. k++ of for loop will increase it, so subtract one here.
                        } else {
                            currentOptimalSetup[k] = newGroup
                        }
                    }
                    // Add to a new fusion group with this member
                    currentOptimalSetup.push([shouldNotBeSync])
                    //console.log("New Optimal Setup: ", currentOptimalSetup)

                    // Was this setup already tested?
                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(currentOptimalSetup))

                    if (alreadyTested) {
                        // The iteration on the current lowest latency was already tested...
                       // console.log("New Optimum has already been tested...")

                        if (nullIfAlreadyTested) {
                            //console.log("Returning Null because it has already been tested")
                            return null
                        }

                        continue
                    }

                    return setupFromList(currentOptimalSetup)
                } else {
                    //console.log("...It is already...")
                }
            }
        }
    }
    console.log("Cannot find anything to improve")
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
        let groupName = fn.replace(".json", "")
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