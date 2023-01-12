# Webshop

This is inspired by the BeFaaS Webshop Example (which is adopted from the google webshop example but applied to faas), but with some more async interaction to better test the features of Fusionize.

## addcartitem (implemented)
```
Payload: {
    "userId": "USER12",
    "item": {
        "productId": "QWERTY",
        "quantity": 2
    }
}
```

Calls cartkvstorage to add item

## cartkvstorage (implemented, needs to return correct format for cart items)

Supports CRUD (add, get tbh) Operations for Cart KV Storage

## checkout (implemented)
```
 {
  "userId": "56437829",
  "userCurrency": "PHP",
  "address": {
    "streetAddress": "Schillerstrasse 9",
    "city": "Munich",
    "state": "Bavaria",
    "country": "Germany"
  },
  "email": "mail@foo",
  "creditCard": {
    "creditCardNumber": "378282246310005",
    "creditCardCvv": 123,
    "creditCardExpirationYear": 2000,
    "creditCardExpirationMonth": 10
  }
 }
 Response 
 {
  "orderId": "123fasd4",
  "shippingTrackingId": "3uwfs",
  "shippingCost": {
    "units": 100,
    "nanos": 500000000,
    "currencyCode": "PHP"
  },
  "shippingAddress": {
    "streetAddress": "Schillerstrasse 9",
    "city": "Munich",
    "state": "Bavaria",
    "country": "Germany"
  },
  "items" : [
    {
      "item": {
        "productId": "1234b",
        "quantity": 3
      },
      "cost": {
        {
          "units": 100,
          "nanos": 500000000,
          "currencyCode": "PHP"
        }
      }
    }
  ]
}
```
Complicated function with lots of interaction.

- Get cart (into Order) (getcart)
- Calculate total Order Price by getting current price of product (getproduct)
- Shipment Service price for current user (shipmentquote)
- Initiates Payment in given Currency (payment)
- Create Shipment Order (shiporder)
- Send out confirmation emails to user (email)
- Delete Cart of user (emptycart)

## currency (implemented)
```
Payload Body: {
  from: {
  "units": 100,
  "nanos": 500000000,
  "currencyCode": "PHP"
  },
  "toCode": "RUB"
}
Response: {
  "units": 146,
  "nanos": 78542481,
  "currencyCode": "RUB"
}
```

convert currency to another currency

## email (implemented)

Send the Object as an email to users. (==do nothing)

## emptycart (implemented, async)
```
Example Payload: {
  "userId": "USER12"
}
```
Remove all objects from a user's cart

## frontend (implemented but untested)

HTTP Frontend (that we don't need) that will call other functions

## getads (implemented)

Returns two random ads (redirect_url, image_url, text) without input

## getcart (implemented)
```
Example Payload: {
  "userId": "USER12"
}
Example Response: {
  "userId": "USER12",
  "items": [{
    "productId": "QWERTY",
    "quantity": 7
  }]
}
```
calls cartkvstorage get

## getproduct (implemented)
```
Example Request: {
 "id": "QWERTY"
}
Example Response: {
  "id": "QWERTY",
  "name": "Bathing Suit",
  "description": "You will never want to take this off!",
  "picture": "bathing_suit.jpg",
  "priceUsd": {
    "currencyCode": "USD",
    "units": 64,
    "nanos": 990000000
  },
  "categories": ["clothing", "bath"]
}
```

reads the json file containing products and returns the relevant key

## listproducts (implemented)
```
Example Response: {
  "products": [{
    "bathing_suit": {
      "id": "QWERTY",
      "name": "Bathing Suit",
      "description": "You will never want to take this off!",
      "picture": "bathing_suit.jpg",
      "priceUsd": {
        "currencyCode": "USD",
        "units": 64,
        "nanos": 990000000
      },
      "categories": ["clothing", "bath"]
    }
  }]
}
```

returns the json file containing all products

## listrecommendations (implemented)
```
Example Payload: {
  "userId": "USER12",
  "productIds": ["QWERTY", "NOTAVAILABLE"]
}
Example Response: {
  "productIds": ["QWERTY"]
}
```
Get all products, recommend products with the same category

## payment (implemented, primes)
```
Ex Payload Body: {
 "amount": {
   "units": 100,
   "nanos": 500000000,
   "currencyCode": "PHP"
 },
 "creditCard": {
   "creditCardNumber": "378282246310005",
   "creditCardCvv": 123,
   "creditCardExpirationYear": 2000,
   "creditCardExpirationMonth": 10
  }
}
Response: {
  "transactionId": "x1234b"
 }
```
returns a transaction ID if the credit card is valid

## searchproducts (implemented)
```
Example Request: {
 "query": "BATHING"
}
Example Response: {
  "results": [{
    "id": "QWERTY",
    "name": "Bathing Suit",
    "description": "You will never want to take this off!",
    "picture": "bathing_suit.jpg",
    "priceUsd": {
      "currencyCode": "USD",
      "units": 64,
      "nanos": 990000000
    },
    "categories": ["clothing", "bath"]
  }]
}
```
search all products for whether they contain a specific key

## shipmentquote (implemented)
```
Ex Payload Body: {
 "address":{
   "streetAddress": "Schillerstrasse 9",
   "city": "Munich",
   "state": "Bavaria",
   "country": "Germany"
 },
 "items":[
   {"id":1,"quantity":6},
   {"id":4,"quantity":-1}
 ]
}
Response: {
  "costUsd": {
    "currencyCode": "USD",
    "units": <shipment cost>,
    "nanos": 0
  }
}
```

calculate a shipping cost based on quantity of items

## shiporder (implemented)
```
Ex Payload Body: {
 "address":{
   "streetAddress": "Schillerstrasse 9",
   "city": "Munich",
   "state": "Bavaria",
   "country": "Germany"
 },
 "items":[
   {"id":1,"quantity":6},
   {"id":4,"quantity":-1}
 ]
}
Response: {
  "id": <some tracking number>
}
```
returns a random product id

## supportedcurrencies (implemented)

A dict with list of supported currency codes. Called by Frontend