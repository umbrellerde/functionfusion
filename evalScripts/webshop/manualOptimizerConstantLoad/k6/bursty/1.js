import http from 'k6/http';

import { check } from 'k6';
import {
    randomIntBetween,
    randomItem,
    randomString,
  } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
    scenarios: {
        burstyWorkload: {
            executor: 'ramping-arrival-rate',
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 200, // if the preAllocatedVUs are not enough, we can initialize more
            startRate: 1,
            timeUnit: "1s",
            stages: [
                { target: 1, duration: '2s' },
                { target: 2, duration: '0.1s' },
                { target: 2, duration: '2s' },
                { target: 3, duration: '0.1s' },
                { target: 3, duration: '2s' },
                { target: 4, duration: '0.1s' },
                { target: 4, duration: '2s' },
                { target: 5, duration: '0.1s' },
                { target: 5, duration: '2s' },
                { target: 6, duration: '0.1s' },
                { target: 6, duration: '2s' },
                { target: 7, duration: '0.1s' },
                { target: 7, duration: '2s' },
                { target: 8, duration: '0.1s' },
                { target: 8, duration: '2s' }
            ]
        },
    },
};

const hostprefix = `${__ENV.BASE_URL}`
const httppost = (task, body) => http.post(`${hostprefix}/SYNC-${task}`, JSON.stringify(body), {headers: { 'Content-Type': 'application/json' }})
const allProductIds = ["1","2","3","4","5","6","7","8","9","10","11"]

export function setup() {
    let userId = `USER${randomString(5)}`
    // let totalItems = 5
    // for(let i = 0; i < totalItems; i++) {
    //     const res = httppost("addcartitem", {
    //         userId: userId,
    //         itemId: randomItem(allProductIds),
    //         quantity: randomIntBetween(1,20)
    //     })
    //     check(res, { 'additem status was 200': (r) => r.status == 200 });
    // }
    return {
        userId: userId
    }
}

export default function (data) {
    const resAdd = httppost("addcartitem", {
        userId: data.userId,
        itemId: randomItem(allProductIds),
        quantity: randomIntBetween(1,20)
    })
    check(resAdd, { 'additem status was 200': (r) => r.status == 200 });

    const resAdd2 = httppost("addcartitem", {
        userId: data.userId,
        itemId: randomItem(allProductIds),
        quantity: randomIntBetween(1,20)
    })
    check(resAdd2, { 'additem status was 200': (r) => r.status == 200 });

    const res = httppost("frontend", {
        operation: "get",
        userId: data.userId,
        currency: "USD"
    })
    check(res, { 'frontend status was 200': (r) => r.status == 200 });

    const res2 = httppost("frontend", {
        operation: "get",
        userId: data.userId,
        currency: "USD"
    })
    check(res2, { 'frontend status was 200': (r) => r.status == 200 });

    const resCo = httppost("frontend", {
        operation: "checkout",
        userId: data.userId,
        currency: "USD"
    })
    check(resCo, { 'checkout status was 200': (r) => r.status == 200 });
}