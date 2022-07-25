const AWS = require("aws-sdk");

AWS.config.update({ region: process.env["AWS_REGION"] })

const s3 = new AWS.S3()
const lambda = new AWS.Lambda();


// TODO read Configuration Metadata, Add a new Configuration, Call
class Call {
    /**
     * @param {string} called Function name that was called
     * @param {string} caller Function name that called the other function
     * @param {boolean} local true if the function was called locally, false if it was called remotely
     * @param {boolean} sync was the invocation supposed to be sync or async
     * @param {number} time duration of the call in ms
     */
    constructor(called, caller, local, sync, time) {
        this.called = called
        this.caller = caller
        this.local = local
        this.sync = sync
        this.time = time
    }
}

class Invocation {
    constructor(invocationObject) {
        /**
         * @typedef {string}
         */
        this.traceId = invocationObject["traceId"]
        /**
         * @typedef {string}
         */
        this.fusionGroup = invocationObject["fusionGroup"]
        /**
         * @typedef {string}
         */
        this.source = invocationObject["source"]
        /**
        * @typedef {string}
        */
        this.currentFunction = invocationObject["currentFunction"]
        /**
        * @typedef {number}
        */
        this.billedDuration = invocationObject["billedDuration"]
        /**
        * @typedef {number}
        */
        this.maxMemoryUsed = invocationObject["maxMemoryUsed"]
        /**
        * @typedef {boolean}
        */
        this.isRootInvocation = invocationObject["isRootInvocation"]
        /**
        * @typedef {number}
        */
        this.startTimestamp = invocationObject["startTimestamp"]
        /**
        * @typedef {number}
        */
        this.endTimestamp = invocationObject["endTimestamp"]
        /**
        * @typedef {number}
        */
        this.internalDuration = invocationObject["internalDuration"]
        /**
        * @typedef {Call[]}
        */
        this.calls = extractCalls(invocationObject["calls"])
    }

    /**
     * 
     * @param {*} callsObject The JSON Containing all calls
     * @returns {Call[]} list of extracted calls
     */
    static extractCalls(callsObject) {
        let calls = []
        for (let call of Object.keys(callsObject)) {
            calls.push(new Call(call["called"], call["caller"], call["local"], call["sync"], call["time"]))
        }
        return calls
    }
}

/**
 * The Rules that govern what functions to call from where
 */
class InvocationRule {
    /**
     * 
     * @param {string} syncStrat remote or local
     * @param {string} syncUrl the Path part of the URL if strategy is remote, e.g. SYNC-A-128
     * @param {string} asyncStrat remote or local
     * @param {string} asyncUrl the Path part of the URL if strategy is remote, e.g. ASYNC-A-128
     */
    constructor(syncStrat, syncUrl, asyncStrat, asyncUrl) {
        this.sync = {
            strategy: syncStrat,
            url: syncUrl
        }
        this.async = {
            strategy: asyncStrat,
            url: asyncUrl
        }
    }
}
/**
 * This is what is saved as Json in every function
 */
class InvocationStrategy {
    /**
     * @param {string} traceName
     * @param {Map<string, Map<string, InvocationRule>>} rules
     */
    constructor(traceName, rules) {
        this.traceName = traceName
        this.rules = rules
    }
}

/**
 * A function Configuration. All the rules that make it work as well as the invocations that belong to it.
 */
class Configuration {
    /**
     * @param {Invocation[]} invocations 
     * @param {InvocationStrategy} strategy
     * @param {Map<string, number} memorySizes The memory size of every task.
     */
    constructor(invocations, strategy, memorySizes) {
        // How the functions were supposed to communicate with each other
        this.invocations = invocations
        this.fusionGroup = invocations[0].fusionGroup
        this.strategy = strategy
        this.memorySizes = memorySizes
    }

    /**
     * @returns {Configuration[]} a list of all tested configurations and their corresponding invocations
     */
    static async getAllConfigurationsAndInvocations() {
        let configurationMetadata = await getFromBucket(process.env["S3_BUCKET_NAME"], process.env["CONFIGURATION_METADATA"])
        
    }

    /**
     * Deploy this configuration to all functions.
     * Ignores the invocations[] and just deploys the strategy and memorySizes
     * @param {string} name the name of the new strategy
     * @param {InvocationStrategy} strategy the new strategy
     * @param {Map<string, number} memorySizes The memory size of every task.
     */
    static async deploy_new_strategy(strategy, memorySizes, name = null) {
        if (name = null) {
            name = Math.floor(Date.now() / 1000)
        }
        // Check if the metadata store already has a configuration with this name
        let existingMetadata = await getFromBucket(process.env["S3_BUCKET_NAME"], process.env["CONFIGURATION_METADATA"])
        if (existingMetadata.hasOwnProperty(name)) {
            throw new Error("The Metadata already contains a field with name" + name + ", please choose a unique name")
        }
        existingMetadata[name] = JSON.stringify(strategy)
        // Sore the new configuration in metadata store
        await uploadToBucket(process.env["S3_BUCKET_NAME"], process.env["CONFIGURATION_METADATA"], existingMetadata)
        // Save strategy to fusion functions.
        // TODO save new default memory Sizes
        // TODO deploy new default memory Sizes
        // TODO call Optideployer
    }
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

/**
 * 
 * @param {string} bucket The Bucket to save the file to
 * @param {string} key The key (~=filename)
 * @param {Object|Array} body The body that will be JSON.stringify-ed to save to s3 
 */
 async function uploadToBucket(bucket, key, body) {
    return await s3.upload({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(body),
    }).promise()
}
