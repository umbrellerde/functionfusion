## Overview

1. Create one Deployment with the same Code for every fusionable. Create an initial deployment of smallest functions possible.

2. Set Env Variables information or whatever with information on what to do in every function

3. Function Handler checks what it is, then invokes locally by importing `require('fusionable/${function}')` or remotely by calling to remote APIGateway

3. Extractor checks logs and writes aggregated information to S3

4. Optimizer checks S3 and decides on next good fusion setup