exports.handler = async function(event) {
    console.log('Event: ', event);
    let responseMessage = 'Hello, World!';

    if (event.queryStringParameters && event.queryStringParameters['Name']) {
        responseMessage = "Hello, " + event.queryStringParameters['Name']
    }

    const aHandler = require("./fusionables/A/handler");

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: responseMessage,
            moduleResponse: aHandler.handler(event),
            originalEvent: event,
            environ: process.env,
        }),
    }
}