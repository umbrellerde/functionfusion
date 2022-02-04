// This is not called directly by AWS but by the Fusion Handler inside the lambda
exports.handler = function(event) {
    console.log('C: Event: ', event);

    return {
        everythings: "all right",
        step: "C"
    }
}