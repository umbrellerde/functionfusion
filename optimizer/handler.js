const AWS = require("aws-sdk");
const { assert } = require("console");

AWS.config.update({ region: process.env["AWS_REGION"] })

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();

const bucketName = process.env["S3_BUCKET_NAME"]
const functionLogGroupNames = process.env["FUNCTION_NAMES"].split(",")

const setupFromList = (list) => list.map(e => e.sort().join(".")).sort().join(",")

exports.handler = async function (event) {

    // Get all .json Files from S3 ==> All Existing Fusion Setups
    let setupsTested = await getAllSetups()

    console.log("All Setups tested", setupsTested)

    // TODO read all setupsTested and find a new setup to try out

    let newConfiguration = generateNewConfiguration(setupsTested)
    let stillTryingNewConfigurations = true

    if (newConfiguration == null) {
        newConfiguration = getConfigurationWithLowestLatency(setupsTested)
        stillTryingNewConfigurations = false
    }

    // Update the Env Variables of all Functions
    let promises = []
    // fname=fusion-function-A ==> Function to handle is part after last "-"
    for (let fname of functionLogGroupNames) {
        let promise = lambda.updateFunctionConfiguration({
            FunctionName: fname,
            Environment: {
                Variables: {
                    'FUSION_GROUPS': setupFromList(newConfiguration),
                    'S3_BUCKET_NAME': bucketName,
                    'FUNCTION_TO_HANDLE': fname.split("-")[2]
                }
            }
        }).promise()
        promises.push(promise)
    }

    await Promise.all(promises)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { setupsTested: setupsTested, newConfiguration: newConfiguration, optimumFound: !stillTryingNewConfigurations },
    }
}

function getConfigurationWithLowestLatency(setupsTested) {
    // Iterate over all Keys, get their content. Iterate over the Content and calculate the average billedDuration
    let averages = {}
    for (let key of Object.keys(setupsTested)) {
        let sumDuration = 0;
        for (let i = 0; i < setupsTested[key].length; i++) {
            sumDuration += setupsTested[key][i]["billedDuration"]
        }
        averages[key] = sumDuration/setupsTested[key].length
    }

    let [minKey, minValue] = ["", Number.MAX_SAFE_INTEGER]
    for (let key of Object.keys(averages)) {
        if (averages[key] < minValue) {
            minKey = key
            minValue = averages[key]
        }
    }
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
        assert(resultConfiguration.includes(fname), "The new configuration must include all function names")
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
                    console.log("!!!!!!! Found One! ", newDefiniteGroups)
                    return newDefiniteGroups
                }
                console.log("...New Group was already tested, continuing", newDefiniteGroups)
            } else {
                console.log("...Since restUngrouped is not empty, going deeper")
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
    return tryAllCombinations([], functionNames)
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
        if (object.Key.includes(".json")) {
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