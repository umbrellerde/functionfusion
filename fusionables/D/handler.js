// This is not called directly by AWS but by the Fusion Handler inside the lambda
module.exports.handler = async (event, context, callback) => {
    console.log('D: Event: ', event, ', Context: ', context, ' Callback: ', callback);
    
    return fusion.finish ({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event: event,
        }),
    })
}