- Continuous Deployment: Don't redeploy function but deploy new funciton and switch over APIGW stuff when it's done
- Read "Max Memory Used" and try to change function to only use this much memory
- Other approach: Deploy N different versions of the function, since it's for free? ==> One for every relevant memory size

- Calculate Cost of management functions and report on it??

- Extractor: By default only extract last 15min?
- Extractor: Optimize API Calls / Make fewer of them??
- Extractor: Store the last time it was called in $dynamoDb to not extract twice? Or read prev. logs to get last timestamp?

-----

- Deploy only the part of functions that really matters

==> Make Terraform deploy the correct deployment packages?? Might be very very slow.
==> Write program that transforms packages dynamically?? Might be not very clean but faster.

-----

How to store what fusion groups have how much memory?
Now: A.B.C,D,E,F

A.B.C-128,D-128,E-128,F-128

(A,B,C;128)-(D;128)-(E;128)-(F;128)

A.B.C,D,E,F;128


-----
# ToDos

- Generalize: Handler looks at (file, db, ...) to determine where to call next
    - TaskId, Sync => Local, URL | File? DynamoDB? ...
    - Optimizer writes File or sth.
    - Handler updates every n minutes
    - Use Env Var with encoded Json

- Extractor
    - ??
    - Make Go Brrrrrm
- Optimizer
    - Algo: Try all memory sizes before switching to new fusion setup?
    - Write size into ENV variable OR into fusion group
- ColdStarts
    - Read/Write correct env variables
- Handler
    - Read Memory Size from Fusion Group OR Env Variable
- Statistics