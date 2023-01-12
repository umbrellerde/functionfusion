// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

let adsarray = [
{
    redirect_url: "tu.berlin/mcc",
    image_url: "tu.berlin/mcc/logo.png",
    text: "This is the best chair in existence, until it will be renamed to S3"
},{
    redirect_url: "tu.berlin/mcc",
    image_url: "tu.berlin/mcc/logo.png",
    text: "This is the best chair in existence, until it will be renamed to S3"
}
]
exports.handler = async function (event, callFunction) {
    console.log("getads", event)
    return adsarray.sort(() => 0.5 - Math.random()).slice(0,2)
}
