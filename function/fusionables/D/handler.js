// This is not called directly by AWS but by the Fusion Handler inside the lambda
exports.handler = function(event) {
    console.log('D: Event: ', event);

    return {
        everythings: "all right",
        step: "D"
    }
    
}