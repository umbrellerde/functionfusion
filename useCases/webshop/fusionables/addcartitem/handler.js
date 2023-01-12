// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function (event, callFunction) {
    console.log("addcartitem", event)

    let addedItemRes = await callFunction("cartkvstorage", {
        operation: "add",
        userId: event["userId"],
        item: {
            productId: event["productId"],
            quantity: event["quantity"]
        }
    }, true)

    console.log("addcartitem got response", addedItemRes)

    return true
}