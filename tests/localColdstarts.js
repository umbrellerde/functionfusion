async function main() {
    process.env["AWS_REGION"] = "eu-central-1"
    process.env["FUNCTION_NAMES"] = process.argv[2] || "fusion-function-addcartitem-256,fusion-function-addcartitem-128,fusion-function-currency-128,fusion-function-currency-384,fusion-function-email-256,fusion-function-email-128,fusion-function-email-384,fusion-function-emptycart-256,fusion-function-emptycart-128,fusion-function-emptycart-384,fusion-function-frontend-256,fusion-function-frontend-128,fusion-function-addcartitem-384,fusion-function-frontend-384,fusion-function-getads-256,fusion-function-getads-128,fusion-function-getads-384,fusion-function-getcart-256,fusion-function-getcart-128,fusion-function-getcart-384,fusion-function-getproduct-256,fusion-function-getproduct-128,fusion-function-getproduct-384,fusion-function-cartkvstorage-256,fusion-function-listproducts-256,fusion-function-listproducts-128,fusion-function-listproducts-384,fusion-function-listrecommendations-256,fusion-function-listrecommendations-128,fusion-function-listrecommendations-384,fusion-function-payment-256,fusion-function-payment-128,fusion-function-payment-384,fusion-function-searchproducts-256,fusion-function-cartkvstorage-128,fusion-function-searchproducts-128,fusion-function-searchproducts-384,fusion-function-shipmentquote-256,fusion-function-shipmentquote-128,fusion-function-shipmentquote-384,fusion-function-shiporder-256,fusion-function-shiporder-128,fusion-function-shiporder-384,fusion-function-supportedcurrencies-256,fusion-function-supportedcurrencies-128,fusion-function-cartkvstorage-384,fusion-function-supportedcurrencies-384,fusion-function-checkout-256,fusion-function-checkout-128,fusion-function-checkout-384,fusion-function-currency-256"
    let coldstarter = require("../managers/coldstarts/handler")

    console.log("Starting Coldstarts")
    
    let optimized = await coldstarter.handler()

    console.log("Finished Coldstarts")

    //console.log(optimized)

}

main()