// This is not called directly by AWS but by the Fusion Handler inside the lambda
module.exports.handler = async (event, context, callback) => {
    console.log('B: Event: ', event, ', Context: ', context, ' Callback: ', callback);
    
    return fusion.invoke([
        {
            dest: 'C',
            event: {
                originalEvent: event,
                result: "B was here!"
            },
            syncronous: false,
        },
        {
            dest: 'D',
            event: {
                originalEvent: event,
                result: "B was here!"
            },
            syncronous: false,
        }
    ])
}