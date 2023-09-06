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
            startRate: 5,
            timeUnit: "1s",
            stages: [
                { target: 5, duration: '2s' },
                { target: 10, duration: '0.1s' },
                { target: 10, duration: '2s' },
                { target: 15, duration: '0.1s' },
                { target: 15, duration: '2s' },
                { target: 20, duration: '0.1s' },
                { target: 20, duration: '2s' },
                { target: 25, duration: '0.1s' },
                { target: 25, duration: '2s' },
                { target: 30, duration: '0.1s' },
                { target: 30, duration: '2s' },
                { target: 35, duration: '0.1s' },
                { target: 35, duration: '2s' },
                { target: 40, duration: '0.1s' },
                { target: 40, duration: '2s' }
            ]
        },
    },
};

const hostprefix = `${__ENV.BASE_URL}`
const httppost = (task, body) => http.post(`${hostprefix}/SYNC-${task}`, JSON.stringify(body), {headers: { 'Content-Type': 'application/json' }})


export default function (data) {
    const resCo = httppost("A", {
        operation: "test",
    })
    check(resCo, { 'A status was 200': (r) => r.status == 200 });
}