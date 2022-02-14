In a single Execution Environment:

Note that the report contains `Init Duration: 150.35 ms` for the first request to a new container. 

`Duration: 48.73 ms	Billed Duration: 49 ms	Memory Size: 128 MB	Max Memory Used: 55 MB` exists in every report.

```
2022-02-14T12:06:40.696+01:00	START RequestId: 0dae47da-7e8d-4dae-a8d5-b2c24040f825 Version: $LATEST
2022-02-14T12:06:40.698+01:00	2022-02-14T11:06:40.698Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO generated Trace id A.B,C,D-0bd40a5f77295625
2022-02-14T12:06:40.698+01:00	2022-02-14T11:06:40.698Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO TraceId A.B,C,D-0bd40a5f77295625
2022-02-14T12:06:40.698+01:00	2022-02-14T11:06:40.698Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO object
2022-02-14T12:06:40.701+01:00	2022-02-14T11:06:40.701Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO A: Event: { sync: true, traceId: 'A.B,C,D-0bd40a5f77295625' }
2022-02-14T12:06:40.701+01:00	2022-02-14T11:06:40.701Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO I should call function C with input { helloFrom: 'A', traceId: 'A.B,C,D-0bd40a5f77295625' } and sync true remotely
2022-02-14T12:06:41.179+01:00	2022-02-14T11:06:41.179Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO finished calling C Promise { <pending> }
2022-02-14T12:06:41.179+01:00	2022-02-14T11:06:41.179Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO I should call function B with input { helloFrom: 'A', traceId: 'A.B,C,D-0bd40a5f77295625' } and sync true locally
2022-02-14T12:06:41.180+01:00	2022-02-14T11:06:41.180Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO B: Event: { helloFrom: 'A', traceId: 'A.B,C,D-0bd40a5f77295625' }
2022-02-14T12:06:41.180+01:00	2022-02-14T11:06:41.180Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO time-local-true-A-B: 0.593ms
2022-02-14T12:06:41.180+01:00	2022-02-14T11:06:41.180Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO finished calling B
2022-02-14T12:06:41.180+01:00	2022-02-14T11:06:41.180Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO time-local-true-A-A: 481.638ms
2022-02-14T12:06:41.498+01:00	2022-02-14T11:06:41.479Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO Sending Request: { host: 'y1joj4k6w9.execute-api.eu-central-1.amazonaws.com', path: '/onlyStage/SYNC-C', method: 'POST', headers: { 'Content-Type': 'application/json' } }
2022-02-14T12:06:42.165+01:00	2022-02-14T11:06:42.165Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO time-remote-true-A-C: 1.464s
2022-02-14T12:06:42.178+01:00	2022-02-14T11:06:42.177Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO time-base: 1.479s
2022-02-14T12:06:42.178+01:00	2022-02-14T11:06:42.178Z 0dae47da-7e8d-4dae-a8d5-b2c24040f825 INFO Result { step: 'A', resultFromB: { everythings: 'all right', step: 'B' }, resultFromC: { everythings: 'all right', step: 'C' } }
2022-02-14T12:06:42.179+01:00	END RequestId: 0dae47da-7e8d-4dae-a8d5-b2c24040f825
2022-02-14T12:06:42.179+01:00	REPORT RequestId: 0dae47da-7e8d-4dae-a8d5-b2c24040f825 Duration: 1483.10 ms Billed Duration: 1484 ms Memory Size: 128 MB Max Memory Used: 79 MB Init Duration: 444.43 ms 
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