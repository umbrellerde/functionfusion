// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
exports.handler = async function (event, callFunction) {
    console.log("frontend", event)

    let operation = event.operation || "get"
    let userId = event.userId || "0"
    let currencyPref = event.currency || "USD"

    switch (operation) {
        case "get":
            let supportedCurrencies = await callFunction("supportedcurrencies", {}, true)
            let productsList = await callFunction("listproducts", {}, true)
            console.log("productsList", productsList)
            productsListCurrency = await Promise.all(productsList.products.map(async pr => {
                let newPrice = await callFunction("currency", {
                    from: pr.priceUsd,
                    toCode: currencyPref
                }, true)
                pr.price = newPrice
                return pr
            }))
            let ads = await callFunction("getads", {}, true)
            let get_cart = await callFunction("getcart", {userId: userId}, true)
            let recommendations = await callFunction("listrecommendations", {productIds: get_cart.map(p => p.id)}, true)

            return {
                ads: ads,
                supportedCurrencies: supportedCurrencies,
                recommendations: recommendations,
                cart: get_cart,
                productsList: productsListCurrency
            }
        case "cart":
            let cart = await callFunction("getcart", {userId: userId}, true)
            let shippingCost = await callFunction("shipmentquote", {userId: userId, items: cart}, true) // Item array with a price
            return {
                cart: cart,
                shippingCost: shippingCost
            }
        case "checkout":
            return await callFunction("checkout", {userId: userId, creditCard: {creditCardNumber: event.creditCardNumber}}, false)
        case "addcart":
            let newItem = await callFunction("addcartitem", {
                userId: userId,
                productId: event.productId || "0",
                quantity: event.quantity || 1
            }, false)
            let newCart = await callFunction("getcart", {userId: userId}, true)
            return {
                newItem: newItem,
                cart: newCart
            }
        case "emptycart":
            await callFunction("emptycart", {userId: userId}, false)
            return {
                userId: userId
            }
        default:
            return {
                error: "The operation specified does not exist."
            }
    }

    // TODO only show a frontend that shows some ads, the current cart, and some reccomendations. Ordering etc. is handled by other functions
}