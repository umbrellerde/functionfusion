//import * as fusion from "../../fusionhandler";

// This is not called directly by AWS but by the Fusion Handler inside the lambda
exports.handler = function(event) {
    console.log('A: Event: ', event);

    return {everythings: "all right"}
    
    // fusion.invoke([
    //     {
    //         dest: 'B',
    //         event: {
    //             originalEvent: event,
    //             result: "A was here!"
    //         },
    //         syncronous: false,
    //     }
    // ])
}