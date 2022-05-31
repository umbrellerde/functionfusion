- Continuous Deployment: Don't redeploy function but deploy new funciton and switch over APIGW stuff when it's done
- Read "Max Memory Used" and try to change function to only use this much memory
- Other approach: Deploy N different versions of the function, since it's for free? ==> One for every relevant memory size

- Calculate Cost of management functions and report on it??

- Extractor: By default only extract last 15min?
- Extractor: Optimize API Calls / Make fewer of them??
- Extractor: Store the last time it was called in $dynamoDb to not extract twice? Or read prev. logs to get last timestamp?