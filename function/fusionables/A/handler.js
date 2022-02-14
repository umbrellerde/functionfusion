// This is not called directly by AWS but by the Fusion Handler inside the lambda
exports.handler = async function(event, callFunction) {
    console.log('A: Event: ', event);

    let reqC = callFunction("C", {helloFrom: "A", traceId: event['traceId']}, true) // Bei False gibt es ein Promise{}  // Bei true auch

    console.log("finished calling C", reqC)

    let reqB = callFunction("B", {helloFrom: "A", traceId: event['traceId']}, true) // Immer ein Promise

    console.log("finished calling B")

    let resC = await reqC
    let resB = await reqB

    return {
        step: "A",
        resultFromB: resB,
        resultFromC: resC
    }
}