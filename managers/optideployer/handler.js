/*
- Make sure terraform runs npm install before creating the ZIP
- Read Zip from originalCode/function.zip
- For all Functions:
    - Get the relevant part of the fusion setup
    - For all Tasks where the "strategy" is not "local"
        - Delete this folder from the Zip
    - Upload new File to "updatedCode/${fname}.zip"
    - Call lambda.updateFunctionCode({
        FunctionName: fname,
        S3Bucket: s3BucketName,
        S3Key: "updatedCode/${fname}.zip",
        PublishVersion: true
    })
*/
"use strict";

const JSZip = require("jszip");
const AWS = require("aws-sdk");
AWS.config.update({ region: process.env["AWS_REGION"] });
const S3 = new AWS.S3();

exports.handler = async function (event) {
}

function getJSZip(bucket, key) {
    return await new JSZip.external.Promise(function (resolve, reject) {
        S3.getObject({
            Bucket: bucket,
            Key: key
        }, function (err, data) {
            if (err) reject(err);
            else resolve(data);
        })
    }).then(function (data) {
        return JSZip.loadAsync(data);
    })
}