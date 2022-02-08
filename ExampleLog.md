In a single Execution Environment:

Note that the report contains `Init Duration: 150.35 ms` for the first request to a new container. 

`Duration: 48.73 ms	Billed Duration: 49 ms	Memory Size: 128 MB	Max Memory Used: 55 MB` exists in every report.

```
START RequestId: d11fa618-9d0d-4235-aa65-36081793488e Version: $LATEST
2022-02-02T08:55:22.954Z	d11fa618-9d0d-4235-aa65-36081793488e	INFO	Event:  [...]
END RequestId: d11fa618-9d0d-4235-aa65-36081793488e
REPORT RequestId: d11fa618-9d0d-4235-aa65-36081793488e	Duration: 48.73 ms	Billed Duration: 49 ms	Memory Size: 128 MB	Max Memory Used: 55 MB	Init Duration: 150.35 ms	
START RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92 Version: $LATEST
2022-02-02T08:55:26.630Z	bca3f17f-c293-44be-b966-ccf2b1e2bc92	INFO	Event:  [...]
END RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92
REPORT RequestId: bca3f17f-c293-44be-b966-ccf2b1e2bc92	Duration: 1.81 ms	Billed Duration: 2 ms	Memory Size: 128 MB	Max Memory Used: 55 MB	
```

A Synchronous Invocation looks like this:

```
{
  resource: '/SYNC-A',
  path: '/SYNC-A',
  httpMethod: 'POST',
  headers: null,
  multiValueHeaders: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  requestContext: {
    resourceId: 'k7rxvq',
    resourcePath: '/SYNC-A',
    httpMethod: 'POST',
    extendedRequestId: 'NNwqSEH0FiAFn9A=',
    requestTime: '08/Feb/2022:08:48:01 +0000',
    path: '/SYNC-A',
    accountId: '135406973402',
    protocol: 'HTTP/1.1',
    stage: 'test-invoke-stage',
    domainPrefix: 'testPrefix',
    requestTimeEpoch: 1644310081668,
    requestId: '197ffe89-17a0-4bd3-ae70-bab11b69d074',
    identity: {
      cognitoIdentityPoolId: null,
      cognitoIdentityId: null,
      apiKey: 'test-invoke-api-key',
      principalOrgId: null,
      cognitoAuthenticationType: null,
      userArn: 'arn:aws:iam::135406973402:root',
      apiKeyId: 'test-invoke-api-key-id',
      userAgent: 'aws-internal/3 aws-sdk-java/1.12.146 Linux/5.4.156-94.273.amzn2int.x86_64 OpenJDK_64-Bit_Server_VM/25.322-b06 java/1.8.0_322 vendor/Oracle_Corporation cfg/retry-mode/standard',
      accountId: '135406973402',
      caller: '135406973402',
      sourceIp: 'test-invoke-source-ip',
      accessKey: 'ASIAR7BXCOHNIHHIPFEV',
      cognitoAuthenticationProvider: null,
      user: '135406973402'
    },
    domainName: 'testPrefix.testDomainName',
    apiId: 'mwytl8cywd'
  },
  body: '{\n    "test": 1234,\n    "sync": true\n}',
  isBase64Encoded: false
}
```

An Asynchronous Invocation looks like this:

```
{ test: 1234 }
```