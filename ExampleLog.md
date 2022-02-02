In a single Execution Environment:

Note that the report contains `Init Duration: 150.35 ms` for the first request to a new container. 

`Duration: 48.73 ms	Billed Duration: 49 ms	Memory Size: 128 MB	Max Memory Used: 55 MB` exists in every report.

```
START RequestId: d11fa618-9d0d-4235-aa65-36081793488e Version: $LATEST
2022-02-02T08:55:22.954Z	d11fa618-9d0d-4235-aa65-36081793488e	INFO	Event:  {
  version: '1.0',
  resource: '/hello',
  path: '/serverless_lambda_stage/hello',
  httpMethod: 'GET',
  headers: {
    'Content-Length': '0',
    Host: 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com',
    'User-Agent': 'curl/7.81.0',
    'X-Amzn-Trace-Id': 'Root=1-61fa46fa-62ff68c76c2e74dc43d98663',
    'X-Forwarded-For': '141.23.190.37',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
    accept: '*/*'
  },
  multiValueHeaders: {
    'Content-Length': [ '0' ],
    Host: [ 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com' ],
    'User-Agent': [ 'curl/7.81.0' ],
    'X-Amzn-Trace-Id': [ 'Root=1-61fa46fa-62ff68c76c2e74dc43d98663' ],
    'X-Forwarded-For': [ '141.23.190.37' ],
    'X-Forwarded-Port': [ '443' ],
    'X-Forwarded-Proto': [ 'https' ],
    accept: [ '*/*' ]
  },
  queryStringParameters: { Name: 'Test7' },
  multiValueQueryStringParameters: { Name: [ 'Test7' ] },
  requestContext: {
    accountId: '135406973402',
    apiId: 'i475fjlmqe',
    domainName: 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com',
    domainPrefix: 'i475fjlmqe',
    extendedRequestId: 'M6AHMizAliAEJ3A=',
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      caller: null,
      cognitoAmr: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '141.23.190.37',
      user: null,
      userAgent: 'curl/7.81.0',
      userArn: null
    },
    path: '/serverless_lambda_stage/hello',
    protocol: 'HTTP/1.1',
    requestId: 'M6AHMizAliAEJ3A=',
    requestTime: '02/Feb/2022:08:55:22 +0000',
    requestTimeEpoch: 1643792122645,
    resourceId: 'GET /hello',
    resourcePath: '/hello',
    stage: 'serverless_lambda_stage'
  },
  pathParameters: null,
  stageVariables: null,
  body: null,
  isBase64Encoded: false
}
END RequestId: d11fa618-9d0d-4235-aa65-36081793488e
REPORT RequestId: d11fa618-9d0d-4235-aa65-36081793488e	Duration: 48.73 ms	Billed Duration: 49 ms	Memory Size: 128 MB	Max Memory Used: 55 MB	Init Duration: 150.35 ms	
START RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92 Version: $LATEST
2022-02-02T08:55:26.630Z	bca3f17f-c293-44be-b966-ccf2b1e2bc92	INFO	Event:  {
  version: '1.0',
  resource: '/hello',
  path: '/serverless_lambda_stage/hello',
  httpMethod: 'GET',
  headers: {
    'Content-Length': '0',
    Host: 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com',
    'User-Agent': 'curl/7.81.0',
    'X-Amzn-Trace-Id': 'Root=1-61fa46fe-2b686171226e80b50a1b7128',
    'X-Forwarded-For': '141.23.190.37',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
    accept: '*/*'
  },
  multiValueHeaders: {
    'Content-Length': [ '0' ],
    Host: [ 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com' ],
    'User-Agent': [ 'curl/7.81.0' ],
    'X-Amzn-Trace-Id': [ 'Root=1-61fa46fe-2b686171226e80b50a1b7128' ],
    'X-Forwarded-For': [ '141.23.190.37' ],
    'X-Forwarded-Port': [ '443' ],
    'X-Forwarded-Proto': [ 'https' ],
    accept: [ '*/*' ]
  },
  queryStringParameters: { Name: 'Test9' },
  multiValueQueryStringParameters: { Name: [ 'Test9' ] },
  requestContext: {
    accountId: '135406973402',
    apiId: 'i475fjlmqe',
    domainName: 'i475fjlmqe.execute-api.eu-central-1.amazonaws.com',
    domainPrefix: 'i475fjlmqe',
    extendedRequestId: 'M6AHzgpBliAEJmw=',
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      caller: null,
      cognitoAmr: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '141.23.190.37',
      user: null,
      userAgent: 'curl/7.81.0',
      userArn: null
    },
    path: '/serverless_lambda_stage/hello',
    protocol: 'HTTP/1.1',
    requestId: 'M6AHzgpBliAEJmw=',
    requestTime: '02/Feb/2022:08:55:26 +0000',
    requestTimeEpoch: 1643792126598,
    resourceId: 'GET /hello',
    resourcePath: '/hello',
    stage: 'serverless_lambda_stage'
  },
  pathParameters: null,
  stageVariables: null,
  body: null,
  isBase64Encoded: false
}
END RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92
REPORT RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92	Duration: 1.81 ms	Billed Duration: 2 ms	Memory Size: 128 MB	Max Memory Used: 55 MB	
```