// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed

const { Worker } = require("worker_threads")

let js_string = `
const { workerData, parentPort } = require('worker_threads');

let num = workerData.num || 8.8
let res = cpu_intensive(num)

parentPort.postMessage(res)

// https://gist.github.com/sqren/5083d73f184acae0c5b7
function cpu_intensive(baseNumber) {
	let result = 0;	
	for (var i = Math.pow(baseNumber, 7); i >= 0; i--) {		
		result += Math.atan(i) * Math.tan(i);
	};
    return result;
}
`

exports.handler = async function (event, callFunction) {
    console.log("checkout", event)
    let userId = event.userId || "0"
    let currencyPref = event.currency || "USD"
    let cart = await callFunction("getcart", {userId: userId}, true)

    // Convert the price of all Products into the preferred currency
    let w1 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            workerData: {},
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })
    let w2 = new Promise((resolve, reject) => {
        const worker = new Worker(js_string, {
            workerData: {},
            eval: true
        })
        worker.on("message", m => resolve(m))
        worker.on("error", m => reject(m))
    })

    let productsList = await callFunction("listproducts", {}, true)
    let orderProducts = await Promise.all(cart.map(async item => {
        let pr = productsList.products.find(pr => pr.id == item.itemId )
        let newPrice = await callFunction("currency", {
            from: pr.priceUsd,
            toCode: currencyPref
        }, true)
        pr.price = newPrice
        return pr
    }))
    console.log("OrderProducts", orderProducts)

    let shipmentPrice = await callFunction("shipmentquote", {userId: userId, items: cart}, true)
    let convertedShipmentPrice = await callFunction("currency", {
        from: shipmentPrice.costUsd,
        toCode: currencyPref
    }, true)

    await callFunction("shiporder",{
        address: event.address,
        items: orderProducts
    },false)

    await callFunction("email", {message: "You are shipped"}, false)
    await callFunction("emptycart", {userId: userId}, false)


    let r1 = await w1
    let r2 = await w2

    return [orderProducts, convertedShipmentPrice]
}