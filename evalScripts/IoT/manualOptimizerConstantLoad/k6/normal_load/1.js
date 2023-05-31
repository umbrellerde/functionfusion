import http from 'k6/http';

import { check } from 'k6';
import {
    randomIntBetween,
    randomItem,
    randomString,
  } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
    scenarios: {
        constant_request_rate: {
            executor: 'constant-arrival-rate',
            rate: 10, // Equals to RPS
            timeUnit: '1s',
            duration: `100s`,
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 600, // if the preAllocatedVUs are not enough, we can initialize more
        },
    },
};

const hostprefix = `${__ENV.BASE_URL}`
const httppost = (task, body) => http.post(`${hostprefix}/SYNC-${task}`, JSON.stringify(body), {headers: { 'Content-Type': 'application/json' }})

export default function (data) {
    const resCo = httppost("I", {
        operation: "test",
    })
    check(resCo, { 'I status was 200': (r) => r.status == 200 });
}