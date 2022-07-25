
- Read "Max Memory Used" and try to change function to only use this much memory
- Other approach: Deploy N different versions of the function, since it's for free? ==> One for every relevant memory size

- Calculate Cost of management functions and report on it??

- Extractor: By default only extract last 15min?
- Extractor: Optimize API Calls / Make fewer of them??

-----

- Deploy only the part of functions that really matters

==> ✔ Write program that transforms packages dynamically?? Might be not very clean but faster.


-----
# ToDos

- ✔ Generalize: Handler looks at env variable json to determine where to call next

- Extractor
    - ✔ Add new Parameter Function Size
    - Make Go Brrrrrm
- Optimizer
    - Algo: Try all memory sizes before switching to new fusion setup?
    - Write size into ENV variable OR into fusion group
    - Maybe report on size of transferred data? Merge big data flows together, even if async.
    - Detect Failures and increase memory size
- ColdStarts
    - ✔ Read/Write correct env variables
- Handler
    - ✔ Read Memory Size from Env Variable
- Evaluation
    - How to set Memory for first called function? Read Deployment from Optimizer to find out how first function should be called.... Or setup APIGW Forwards
- Statistics
- Configuration Metadata
    - ✔ {timestamp : { rules=likeHandler}} (Object with key=Timestamp, value=Object that is read by Handler etc.)