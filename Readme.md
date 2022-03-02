## Overview

1. Create one Deployment with the same Code for every fusionable. Create an initial deployment of smallest functions possible.

2. Set Env Variables information or whatever with information on what to do in every function

3. Function Handler checks what it is, then invokes locally by importing `require('fusionable/${function}')` or remotely by calling to remote APIGateway

3. Extractor checks logs and writes aggregated information to S3

4. Optimizer checks S3 and decides on next good fusion setup

## Sieve of Erastotanes

Instead of detecting on images, we use a workload that is easier to fine-tune to make the experiments more relevant.

Using the more efficient algorithm, calculating the first 4.5 million primes took \~1.2s and \~110MB of memory on the smallest available Lambda Instance.
The less effective algorithm took \~1.8s and \~110MB to calculate the first million primes.