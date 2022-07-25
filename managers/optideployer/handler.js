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
    let mainZipFile = await getS3Object(s3Bucket, process.env["FUNCTION_ZIP_OBJECT"])
    let setups = JSON.parse(await getS3Object(s3Bucket, process.env["CONFIGURATION_METADATA"]))
    let promises = []
    for (let fname of deployedFunctionNames) {
        promises.push(updateFunction(fname, mainZipFile, setups));
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

async function updateFunction(fname, mainZipFile, setups) {
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
    let lastTimestamp = Math.max(...Object.keys(setups).map(val => parseInt(val)))
    let setupToUse = setups[lastTimestamp]
    console.log("New Setup to Use: ", lastTimestamp)
    mainZip.file("setup.json", JSON.stringify(setupToUse))

    // Upload the new function to S3
    let newZip = await mainZip.generateAsync({type:"nodebuffer"});
    let newKey = `updatedCode/${fname}.zip`
    let uploaded = await S3.upload({
        Bucket: s3Bucket,
        Key: newKey,
        Body: newZip,
    }).promise();
    console.log("Uploaded File is", uploaded);
    // Update the function code
    let newCode = await Lambda.updateFunctionCode({
        FunctionName: fname,
        S3Bucket: s3Bucket,
        S3Key: newKey,
        Publish: true
    }).promise();

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
    let lastTimestamp = Math.max(...Object.keys(setups).map(val => parseInt(val)))
    console.log("Getting keys from object", lastTimestamp, "rules", thisTaskName)
    console.log("Object:", setups)
    console.log("Keys:", Object.keys(setups).map(val => parseInt(val)))
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