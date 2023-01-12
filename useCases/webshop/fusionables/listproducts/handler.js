// This is not called directly by AWS but by the Fusion Handler inside the lambda
// callFunction is a function that expects three parameters: The Function to Call, the parameters to pass, and whether the result is sync. It returns a promise that *must* be await-ed
let products = [
    {
        "id": "QWERTY1",
        "name": "T-Shirt",
        "description": "For those who know how to code like a boss!",
        "picture": "programmer_tshirt.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 24,
            "nanos": 990000000
        },
        "categories": ["clothing", "programming"]
    },
    {
        "id": "QWERTY2",
        "name": "Coffee Mug",
        "description": "For those all-nighters coding sessions.",
        "picture": "coffee_mug.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 14,
            "nanos": 990000000
        },
        "categories": ["kitchen", "programming"]
    },
    {
        "id": "QWERTY3",
        "name": "Computer Mouse",
        "description": "For those who like to point and click, not just point and talk.",
        "picture": "computer_mouse.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 34,
            "nanos": 990000000
        },
        "categories": ["electronics", "computers"]
    },
    {
        "id": "QWERTY4",
        "name": "Keyboard",
        "description": "For those who prefer to express themselves through typing.",
        "picture": "keyboard.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 44,
            "nanos": 990000000
        },
        "categories": ["electronics", "computers"]
    },
    {
        "id": "QWERTY5",
        "name": "Monitor",
        "description": "For those who like to keep an eye on things.",
        "picture": "monitor.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 64,
            "nanos": 990000000
        },
        "categories": ["electronics", "computers"]
    },
    {
        "id": "QWERTY6",
        "name": "Headphones",
        "description": "For those who like to code in silence... or with music.",
        "picture": "headphones.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 74,
            "nanos": 990000000
        },
        "categories": ["electronics", "computers"]
    },
    {
        "id": "QWERTY7",
        "name": "Computer Case",
        "description": "For those who like to keep their computer looking good and running cool.",
        "picture": "computer_case.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 84,
            "nanos": 990000000
        },
        "categories": ["electronics", "computers"]
    },
    {
        "id": "QWERTY13",
        "name": "Programmer Hoodie",
        "description": "Stay warm and cozy while coding the night away!",
        "picture": "programmer_hoodie.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 39,
            "nanos": 990000000
        },
        "categories": ["clothing", "programming"]
    },
    {
        "id": "QWERTY14",
        "name": "Programmer Scarf",
        "description": "Stay stylish and warm during those cold programming sessions.",
        "picture": "programmer_scarf.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 29,
            "nanos": 990000000
        },
        "categories": ["clothing", "programming"]
    },
    {
        "id": "QWERTY15",
        "name": "Programmer Apron",
        "description": "Keep your clothes clean while you cook up some code!",
        "picture": "programmer_apron.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 19,
            "nanos": 990000000
        },
        "categories": ["kitchen", "programming"]
    },
    {
        "id": "QWERTY16",
        "name": "Programmer Lunchbox",
        "description": "Take your programming skills to lunch with you!",
        "picture": "programmer_lunchbox.jpg",
        "priceUsd": {
            "currencyCode": "USD",
            "units": 12,
            "nanos": 990000000
        },
        "categories": ["kitchen", "programming"]
    }        
]

exports.handler = async function (event, callFunction) {
    console.log("listproducts", event)
    return {
        products: products
    }
}