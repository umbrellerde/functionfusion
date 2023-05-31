import http from 'k6/http';

import { check } from 'k6';

export const options = {
    scenarios: {
        constant_request_rate: {
            executor: 'constant-arrival-rate',
            rate: __ENV.RPS, // Equals to RPS
            timeUnit: '1s',
            duration: `${__ENV.DURATION}s`,
            preAllocatedVUs: 100, // how large the initial pool of VUs would be
            maxVUs: 200, // if the preAllocatedVUs are not enough, we can initialize more
        },
    },
};

const hostprefix = `${__ENV.BASE_URL}`
const httppost = (task, body) => http.post(`${hostprefix}/SYNC-${task}`, JSON.stringify(body), {headers: { 'Content-Type': 'application/json' }})

export default function (data) {
    const resCo = httppost("A-1024", {
        operation: "test",
    })
    check(resCo, { 'A status was 200': (r) => r.status == 200 });
}