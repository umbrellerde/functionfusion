// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
const EUR_RATES = {
    EUR: 1.0,
    CAD: 1.5231,
    HKD: 8.3693,
    ISK: 157.5,
    PHP: 54.778,
    DKK: 7.4576,
    HUF: 354.7,
    CZK: 27.589,
    AUD: 1.6805,
    RON: 4.84,
    SEK: 10.6695,
    IDR: 16127.82,
    INR: 81.9885,
    BRL: 6.3172,
    RUB: 79.6208,
    HRK: 7.5693,
    JPY: 115.53,
    THB: 34.656,
    CHF: 1.0513,
    SGD: 1.5397,
    PLN: 4.565,
    BGN: 1.9558,
    TRY: 7.4689,
    CNY: 7.6759,
    NOK: 11.0568,
    NZD: 1.8145,
    ZAR: 20.0761,
    USD: 1.0798,
    MXN: 25.8966,
    ILS: 3.8178,
    GBP: 0.88738,
    KRW: 1332.6,
    MYR: 4.6982
}

exports.handler = async function (event, callFunction) {
    console.log("supportedcurrencies", event)
    return {
        currencyCodes: Object.keys(EUR_RATES)
    }
}