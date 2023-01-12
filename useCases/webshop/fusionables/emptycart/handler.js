// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function (event, callFunction) {
    console.log("emptycart", event)
    await callFunction("cartkvstorage", {operation: "empty", userId: event.userId}, false)
    return true
}