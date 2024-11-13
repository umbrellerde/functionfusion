/*
- Make sure terraform runs npm install before creating the ZIP
- Get the function configuration from any deployed fusion function
- Read Zip from originalCode/function.zip

*/

const JSZip = require("jszip");
// const fs = require("fs/promises")

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env["AWS_REGION"] });
const S3 = new AWS.S3();
const Lambda = new AWS.Lambda();

const deployedFunctionNames = process.env["FUNCTION_NAMES"].split(",");
const allTaskNames = [...new Set(deployedFunctionNames.map(el => el.split("-")[2]))] // Turn it into a set and back into a list to remove duplicates (functions deployed with different sizes)
const s3Bucket = process.env["S3_BUCKET_NAME"]

exports.handler = async function (event) {
    console.log("Event is:", event)
    let urlPromise = getAPIGWBaseURL()
    let mainZipFile = await getS3Object(s3Bucket, process.env["FUNCTION_ZIP_OBJECT"])
    let setups = JSON.parse(await getS3Object(s3Bucket, process.env["CONFIGURATION_METADATA"]))
    let promises = []
    let apigwUrls = await urlPromise
    for (let fname of deployedFunctionNames) {
        promises.push(updateFunction(fname, mainZipFile, setups, apigwUrls));
        //await updateFunction(fname, mainZipFile, setups)
    }
    let results = await Promise.all(promises);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { results: Object.keys(results) },
    }
}

async function updateFunction(fname, mainZipFile, setups, apigwUrls) {
    let mainZip = new JSZip();
    await mainZip.loadAsync(mainZipFile);
    let localTasks = await getLocalTasksOfFunction(fname, setups);
    let tasksToDelete = allTaskNames.filter(el => !localTasks.includes(el));

    console.log("Tasks to delete are:", tasksToDelete);
    // Modify the Zip, delete all unnecessary folders
    tasksToDelete.forEach(task => mainZip.remove("fusionables/" + task));
    console.log("Zip with removed folders:", mainZip);

    // get the current Setup and save it as setup.json in the zip
    // Find the most recent timestamp
    let lastTimestamp = Object.keys(setups).sort().slice(-1)[0]
    let setupToUse = setups[lastTimestamp]
    console.log("New Setup to Use: ", lastTimestamp)
    mainZip.file("setup.json", JSON.stringify(setupToUse))
    mainZip.file("apigw.json", JSON.stringify(apigwUrls))

    // Upload the new function to S3
    let newZip = await mainZip.generateAsync({ type: "nodebuffer" });
    let newKey = `updatedCode/${fname}.zip`
    let uploaded = await S3.upload({
        Bucket: s3Bucket,
        Key: newKey,
        Body: newZip,
    }).promise();
    console.log("Uploaded File is", uploaded);
    // Update the function code

    let newCode = {}
    for(let tries = 1; tries <= 11; tries++) {
        try {
            newCode = await Lambda.updateFunctionCode({
                FunctionName: fname,
                S3Bucket: s3Bucket,
                S3Key: newKey,
                Publish: true
            }).promise();
            break
        } catch (error) {
            if(tries == 11) {
                console.error("Was not able to update Function Code in a reasonable amount of time", error)
            }
            await new Promise(resolve => setTimeout(resolve, tries * 2000))
        }
    }

    console.log("Updated Function", newCode);
    return newCode
}

async function getS3Object(bucket, key) {
    console.log("Getting bucket/key", bucket, key)
    let s3 = await S3.getObject({
        Bucket: bucket,
        Key: key
    }).promise();
    console.log("Result is", s3)
    return s3.Body;
}

async function getLocalTasksOfFunction(fname, setups) {
    console.log("Getting Function Configuration for function", fname);
    let thisTaskName = fname.split("-")[2]
    // TODO this is not a good solution
    let lastTimestamp = Object.keys(setups).sort().slice(-1)[0]
    console.log("Getting keys from object", lastTimestamp, "rules", thisTaskName)
    console.log("Object:", setups)
    console.log("Keys:", Object.keys(setups))
    let functionSettings = setups[lastTimestamp]["rules"][thisTaskName]
    // We only need the tasks that are actually executed locally to be in the ZIP
    // Get a list of local tasks (sync.strategy == local or async.strategy == local)
    console.log("Function Settings for function are:", functionSettings);
    let localTasks = [];
    for (let key of Object.keys(functionSettings)) {
        if (functionSettings[key]["sync"]["strategy"] == "local"
            || functionSettings[key]["async"]["strategy"] == "local") {
            localTasks.push(key);
        }
    }
    // Just make sure that the main tasks is also in the local tasks
    if (!localTasks.includes(thisTaskName)) {
        localTasks.push(thisTaskName);
    }
    console.log("Tasks that should be inside the function:", localTasks)
    return localTasks;
}

/**
 * So this is a nice but also not very elegant hack: The fusion handler needs this Base Address to remotely call to other functions.
 * We cannot directly write this address into an env variable via terraform since the APIGW can only be created after the functions are deployed, after which its not possible to alter the function env variables anymore
 * It currently gets this after every cold start, which takes around 1s and makes cold starts very very slow if the send a remote request
 * So the solution is: Before the first run of the optimizer, the fusion handler needs to take this slow approach. But after the first run, we will always write the base url into a well known file. So it might be a good idea to just run the optimizer empty after the `terraform apply`
 */
async function getAPIGWBaseURL() {
    let startTime = Date.now()
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
    console.log("overhead-ApiCallUrls", Date.now() - startTime)
    return {
        "path": basePath,
        "url": baseUrl
    }

}