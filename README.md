# FUSIONIZE: Improving Serverless Application Performance through Feedback-Driven Function Fusion

Fusionize is a framework that re- moves these concerns from developers by automatically fusing the application code into a multi-function orchestration with varying function size.
Developers only need to write the application code following a lightweight programming model and do not need to worry how the application is turned into functions

This repository contains our example applications and the prototype for AWS Lambda.
If you want to run this yourself, please check the `terraform/` folder.
## Research

If you use this software in a publication, please cite it as:

### Text

Trever Schirmer, Joel Scheuner, Tobias Pfandzelter, David Bermbach. Fusionize++: Improving Serverless Application Performance Using Dynamic Task Inlining and Infrastructure Optimization. IEEE Transactions on Cloud Computing 2024

### BibTeX

```bibtex
@article{schirmer2024fusionizepp,
  author={Schirmer, Trever and Scheuner, Joel and Pfandzelter, Tobias and Bermbach, David},
  journal={IEEE Transactions on Cloud Computing}, 
  title={FUSIONIZE++: Improving Serverless Application Performance Using Dynamic Task Inlining and Infrastructure Optimization}, 
  year={2024},
  volume={},
  number={},
  pages={1-16},
  keywords={Task analysis;Costs;Cloud computing;Monitoring;Runtime;Optimization;Load modeling;serverless computing;FaaS;function fusion;cloud orchestration},
  doi={10.1109/TCC.2024.3451108}
}
```

For a full list of publications, please see [our website](https://www.tu.berlin/en/mcc/research/publications/).

### License

<!-- The code in this repository is licensed under the terms of the [...](./LICENSE). -->
The code in this repository is not yet licensed.

## Overview

1. Create one deployment with the same code for every application.
   Create an initial deployment of the smallest functions possible.

1. Set environment variables information or whatever with information on what to do in every function

1. Function handler checks what it is, then invokes locally by importing `require('fusionable/${function}')` or remotely by calling to remote AWS API Gateway

1. Extractor checks AWS CloudWatch logs and writes aggregated information to S3

1. Optimizer checks S3 and decides on next good fusion setup

## Example Workload: Sieve of Erasthostenes

Instead of detecting on images, we use a workload that is easier to fine-tune to make the experiments more relevant.

Using the more efficient algorithm, calculating the first 4.5 million primes took \~1.2s and \~110MB of memory on the smallest available Lambda instance.
The less effective algorithm took \~1.8s and \~110MB to calculate the first million primes.


## Files
```text
├── coldstarts - function to generate coldstarts
├── doTestrunColdstarts.sh - shell script to run cold start test
├── doTestrun.sh - shell script to run normal test
├── ExampleLog.md - Log that can be used to test extractor
├── extractor - function that reads logs and creates call graph JSON
├── .gitignore
├── optimizer - function that reads call graph, creates new fusion setup, and overwrites ENV variables of fusion functions
├── README.md
├── statistics - statistics and graphs for the paper
│   ├── finalstats.ipynb
│   ├── results
│   │   ├── finalTests
│   │   └── initialTests
│   └── stats.ipynb
├── terraform - Read this for how to run tests
├── tests - stuff that is only intended to run locally
├── useCases - two example use cases
│   ├── IoT
│   │   ├── fusionables
│   │   │   ├── Readme.md
│   │   ├── handler.js
│   │   ├── package.json
│   │   └── Readme.md
│   └── split
│       ├── fusionables
│       │   └── Readme.md
│       ├── handler.js
│       ├── package.json
│       └── Readme.md
└── Workload.md - description of IoT Use Case
```
