/**
 * @typedef {{dest: string, event: Object, syncronous: boolean}} Destination
 */

/**
 * @typedef {{name: string, local: boolean, remoteUrl: string}} Configuration
 * @type {Configuration[]}
 */
const configurations = {}; //TODO

const https = require("https");

/**
 * 
 * @param {Destination[]} destinations - Where the next invocations should go.
 * @returns {Dictionary}
 */
export function invoke(destinations) {

    // Check how many invocations there are

    // First do all the async invocations
    destinations.filter(d => !d.syncronous).forEach(d => {
        setTimeout(0, () => {

            config = configurations.find((c) => c.name === d.dest)

            if (config.local) {
                // TODO
            } else {
                httpPost(config.remoteUrl, "", d.event)
            }

        })
    })

    // Then do all the sync invocations
    let results = []
    destinations.filter(d => d.syncronous).forEach(d => {
        config = configurations.find((c) => c.name === d.dest)

        if (config.local) {
            // TODO
        } else {
            await httpPost(config.remoteUrl, "", d.event)
                .then(res => results.append(res))
                .catch((err) => console.error("Error during request: ", d, "Config is: ", config, "Error is: ", err))
        }

    })

    console.log("Invoke: ", destinations)

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            destinations: destinations,
            results: results,
        }),
    }

}

export function finish(result) {

    // Read from configuration where the result should be stored.

    // Either send result into void or return sync result.

}

/**
 * 
 * @param {string} url 
 * @param {Object} data 
 */
function httpPost(host, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            host: host,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
        const req = https.request(options, (res) => {
            resolve(res)
        })

        req.on('error', (e) => {
            reject(e)
        })

        req.write(JSON.stringify(data))
        req.end()
    })
}