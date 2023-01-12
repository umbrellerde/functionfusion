// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function (event, callFunction) {
    console.log("checkout", event)
    let userId = event.userId || "0"
    let currencyPref = event.currency || "USD"
    let cart = await callFunction("getcart", {userId: userId})

    // Convert the price of all Products into the preferred currency

    let productsList = await callFunction("listproducts", {}, true)

    let orderProducts = await Promise.all(cart.items.map(async item => {
        let pr = productsList.find(pr => pr.id == item.productId )
        let newPrice = await callFunction("currency", {
            from: pr.priceUsd,
            toCode: currencyPref
        }, true)
        pr.price = newPrice
        return pr
    }))

    let shipmentPrice = await callFunction("shipmentquote", {userId: userId, items: cart.items}, true)
    let convertedShipmentPrice = await callFunction("currency", {
        from: shipmentPrice.costUsd,
        toCode: currencyPref
    }, true)

    let transactionId = await callFunction("shiporder",{
        address: event.address,
        items: orderProducts
    },true)

    await callFunction("email", transactionId, false)
    await callFunction("emptycart", {userId: userId}, false)

    return [orderProducts, convertedShipmentPrice, transactionId]
}