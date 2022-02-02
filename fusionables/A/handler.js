import * as fusion from "../../fusionhandler";

// This is not called directly by AWS but by the Fusion Handler inside the lambda
module.exports.handler = async (event, context, callback) => {
    console.log('A: Event: ', event, ', Context: ', context, ' Callback: ', callback);

    return fusion.invoke([
        {
            dest: 'B',
            event: {
                originalEvent: event,
                result: "A was here!"
            },
            syncronous: false,
        }
    ])
}