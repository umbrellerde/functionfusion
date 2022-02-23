// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function(event, callFunction) {
    console.log('SoundCheckAccident: Event: ', event);

    let callingEvent = event["originalEvent"]

    // TODO check cameras for ???

    return {
        isAccident: Math.random() >= 0.9
    }
}