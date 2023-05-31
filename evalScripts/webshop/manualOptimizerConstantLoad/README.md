Here we want to test a few different things:

1. Everything is local (TODO create this manually)
2. Everything is remote (this is default configuration in generateConfigurations)
3. Optimized setup (this is hopefully last configuration in generateConfigurations)

Under a few different loads

- Bursty Workload
- Coldstarts
- Normal load

So, do three testruns with different load generators

Bursty workload:
- start with 1 req/s for 30s
- ramp up to 15 req/s within 30s
- continue 15 req/s for 30s
- ramp down to 1 req/s within 30s
- continue with 1 req/s for 30s

==> 930 Requests overall

-----

testfor-bursty_workload-3: First test where everything went well, but I forgot to add erastotenes to some of the async calls, so now they are not that much faster.
highload-bursty_workload-3: That one has erastotenes sprinkled everywhere, and the extractor took fooorever