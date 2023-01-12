// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function (event, callFunction) {
    console.log("listrecommendations", event)
    let products = await callFunction("listProducts", {}, true)
    let goodProducts = products.filter(e => event.productIds.includes(e.id))
    let goodProductIds = goodProducts.map(e=>e.id)
    let categories = goodProducts.map(e => e.categories).flatten()

    let otherProducts = products.filter(e => {
        if(goodProductIds.includes(e.id)) {
            return false
        }
        let sameCategoriesCounter = e.categories.find(cat => categories.includes(cat)).length
        if(sameCategoriesCounter > 0) {
            return true
        }
        return false
    })

    return otherProducts.sort(() => 0.5 - Math.random()).slice(0,2)
}