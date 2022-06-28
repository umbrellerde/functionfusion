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
const justFunctionNames = deployedFunctionNames.map(el => el.split("-")[2])
const s3Bucket = process.env["S3_BUCKET_NAME"]

exports.handler = async function (event) {
    // TODO with the default config this deletes everything
    console.log("Event is:", event)
    let mainZipFile = await getZip(s3Bucket, process.env["FUNCTION_ZIP_OBJECT"]);
    let promises = []
    //console.log("Main Zip File:", mainZipFile)
    for (let fname of deployedFunctionNames) {
        //promises.push(updateFunction(fname, mainZipFile));
        console.log("Loop is at", fname)
        await updateFunction(fname, mainZipFile)
    }
    let result = await Promise.all(promises);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: { results: "tests" },
    }
}

async function updateFunction(fname, mainZipFile) {
    let mainZip = new JSZip();
    await mainZip.loadAsync(mainZipFile);
    let localTasks = await getLocalTasksOfFunction(fname);
    let tasksToDelete = justFunctionNames.filter(el => !localTasks.includes(el));

    console.log("Tasks to delete are:", tasksToDelete);
    // Modify the Zip, delete all unnecessary folders
    tasksToDelete.forEach(task => mainZip.remove("fusionables/" + task));
    console.log("Zip with removed folders:", mainZip);

    // Upload the new function to S3
    let newZip = await mainZip.generateAsync({type:"nodebuffer"});
    //await fs.writeFile(`/tmp/${fname}.zip`, newZip)
    let uploaded = await S3.upload({
        Bucket: s3Bucket,
        Key: `updatedCode/${fname}.zip`,
        Body: newZip,//await fs.readFileFile(`/tmp/${fname}.zip`),
    }).promise();
    console.log("Uploaded File is", uploaded);
    // Update the function code
    let newCode = await Lambda.updateFunctionCode({
        FunctionName: fname,
        S3Bucket: s3Bucket,
        S3Key: `updatedCode/${fname}.zip`,
        PublishVersion: true
    });

    console.log("Updated Function", newCode);
    return newCode
}

async function getZip(bucket, key) {
    console.log("Getting bucket/key", bucket, key)
    let s3 = await S3.getObject({
        Bucket: bucket,
        Key: key
    }).promise();
    console.log("Result is", s3)
    return s3.Body;
}

async function getLocalTasksOfFunction(fname) {
    console.log("Getting Function Configuration for function", fname);
    let currentConfiguration = await Lambda.getFunctionConfiguration({
        FunctionName: fname
    }).promise();

    // TODO this is not a good solution
    console.log("All Envs are: ", currentConfiguration["Environment"]["Variables"])
    console.log("Fusion Settings RAW are:", currentConfiguration["Environment"]["Variables"]["FUSION_SETUPS"])
    let functionSettings = Buffer.from(currentConfiguration["Environment"]["Variables"]["FUSION_SETUPS"], "base64").toJSON()["rules"][fname.split("-")[2]];
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
    console.log("Tasks that should be inside the function:", localTasks)
    // Just make sure that the main tasks is also in the local tasks
    if (!localTasks.includes(fname)) {
        localTasks.push(fname);
    }
    return localTasks;
}