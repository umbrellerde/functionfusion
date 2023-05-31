
(✔ == Coded, ✅ == Texted)

- Calculate Cost of management functions and report on it??

- Extractor: ✔ By default only extract last 15min?
- Optideployer: ✅ Optimize API Calls / Make fewer of them??

-----

- Deploy only the part of functions that really matters

==> ✅ Write program that transforms packages dynamically?? Might be not very clean but faster.


-----
# ToDos 2022

- ✅ Generalize: Handler looks at env variable json to determine where to call next

- Extractor
    - ✅ Add new Parameter Function Size
    - Make Go Brrrrrm
- Optimizer
    - ✅ Algo: Try all memory sizes in optimal setup
    - ✅ Write size into ENV variable OR into fusion group
    - X Maybe report on size of transferred data? Merge big data flows together, even if async.
    - X Detect Failures and increase memory size
- ColdStarts
    - ✅ Read/Write correct env variables
- Handler
    - ✅ Read Memory Size from Env Variable
- Evaluation
    - X How to set Memory for first called function? Read Deployment from Optimizer to find out how first function should be called.... Or setup APIGW Forwards
- Statistics
- Configuration Metadata
    - ✅ (dont write that down...) {timestamp : { rules=likeHandler}} (Object with key=Timestamp, value=Object that is read by Handler etc.)

---

__Extended TCC (David)__

✅ flexibility one task in "multiple fusion groups". Bsp Logging, async DB Updates, ...

✔ X(kleinste die garantiert funkioniert) init memory size ist in der mitte
✅ memory warum wie initial und wie optimieren? (Uns ist klar dass das Corner Cases nicht abdeckt, halten wir aber für unwichtig)

(poke invocation for fewer cold start - schalter mit optideployer ausschalten verbinden - wenn meins auch ohne gut ist nur in der discussion)

neuer use case evaluation - befaas async citen (mehrere rufen einen auf, )
✅ - 3 extrema extensive benchmarken: realistische baseline, alles gefused, mein optimizer
✅ - bursty workload, cold starts, ... === gefundenes ist in unters. varianten gute option

✅ optideployer

__Sprint 02.2023__

Stuff to maybe consider in the evaluation and write down in the discussion in every case

- Marginal Cost vs. Marginal Latency increase
- ✅ Corner Cases & Nonlinear Utility
- ✅ Use Disk if not enough memory?


__Extended Providerseitig__

Daten automatisch auch richtig transportieren.
    - Hash der Daten vergleichen ob was durchgegeben wird

Eventuell auch Hardless dann endlich integrieren
