// Same code as in optimizer that is just easier to test

let input = {
    "A.B.C.D.E.F.G": [ // The name of the current fusion setup. Elements seperated with are dot are in the same fusion group, elements seperated with a "," are in different groups
        {
            "traceId": "f1940f9795747e2a",
            "fusionGroup": "A,B,C,D", // Fusion Setup, same as the name of the list this object is in
            "source": "A", // Where was the original invocatino from? In case of Root invocation, this is also the current function
            "currentFunction": "A", // What is the base function of the currently running function?
            "billedDuration": 2056, // Extracted from the Lambda Report
            "maxMemoryUsed": 80, // as reported by Lambda
            "isRootInvocation": true, // True if this is the invocation stat started a trace (==> First one to create the trace)
            "startTimestamp": 1645016691288, // Time from START to STOP according to Lambda
            "endTimestamp": 1645016693329,
            "internalDuration": 2030, // How long the base invokeLokal()-call took
            "calls": [
                {
                    "called": "A",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "B",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "D",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "E",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "C",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": false, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "F",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": false, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                },
                {
                    "called": "G",
                    "caller": "A",
                    "local": true, // Whether this call was fulfilled locally (according to fusion group)
                    "sync": false, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                    "time": 641, // how long the invoke Call took for the function that called it
                }
            ]
        },
    ],
    "A.B.D.E.F.G,C": [
        {
            "billedDuration": 3000,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A.B.D.E.G,C,F": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A.B.D.E,C,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ]
    ,
    "A,B.D.E,C,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A,B,C,D.E,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A,B,C,D,E,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A.B,C,D,E,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ],
    "A.B.D,C,E,F,G": [
        {
            "billedDuration": 10,
            "calls": [{
                "called": "A",
                "caller": "A",
                "local": true, // Whether this call was fulfilled locally (according to fusion group)
                "sync": true, // Whether the result was used by caller (=> sync), or the caller ignored the result (=> sync===false)
                "time": 641, // how long the invoke Call took for the function that called it
            }]
        }
    ]

}

const functionLogGroupNames = ["Function- -A", "Function- -B", "Function- -C", "Function- -D", "Function- -E", "Function- -F", "Function- -G",]

const setupFromList = (list) => list.map(e => e.sort().join(".")).sort().join(",")
const listFromSetup = (setup) => setup.split(",").map(g => g.split("."))
const pairs = (arr) => arr.map( (v, i) => arr.slice(i + 1).map(w => [v, w]) ).flat();
function getConfigurationWithLowestLatency(setupsTested) {
    // Iterate over all Keys, get their content. Iterate over the Content and calculate the median billedDuration

    function median(values) {
        if (values.length === 0) throw new Error("No inputs");

        values.sort(function (a, b) {
            return a - b;
        });

        var half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];

        return (values[half - 1] + values[half]) / 2.0;
    }

    let medians = {}
    for (let key of Object.keys(setupsTested)) {
        medians[key] = median(setupsTested[key].map(inv => inv["billedDuration"]))
    }

    // medians["A.B.C"] = 25, etc...


    let [minKey, minValue] = ["", Number.MAX_SAFE_INTEGER]
    for (let key of Object.keys(medians)) {
        if (medians[key] < minValue) {
            minKey = key
            minValue = medians[key]
        }
    }
    return minKey
}
function iterateOnLowestLatency(setupsTested, nullIfAlreadyTested = false, functionToFindBase = getConfigurationWithLowestLatency) {
    let currentMin = functionToFindBase(setupsTested)
    let currentOptimalSetup = listFromSetup(currentMin)
    console.log("Current Optimal Setup is:", currentOptimalSetup)
    // change something about this configuration smartly:
    // - Check if there are sync calls to functions that are not fused yet.
    // - Change a SINGLE thing about the configuration and try it out.

    // Get a Set of Sets where every inside set are all the functions that sync-call each other
    let syncCalls = new Set()
    // Initialize the Set so that initially every function is inside its own syncSet
    let functionNames = functionLogGroupNames.map(fn => fn.split("-")[2])
    functionNames.forEach(fname => syncCalls.add(new Set(fname)))

    // Go over all Invocations and merge the sets that call each other
    for (let key of Object.keys(setupsTested)) {
        let invocationsList = setupsTested[key]
        for (let invocation of invocationsList) {
            // This is a List of Functions that should be in the same fusion group
            let syncCallsList = invocation["calls"]
                .filter((call) => call["sync"] == true)
                .map((call) => call["called"])
            // Go over every pair of sync calls and check if they are already in the same sync set
            pairs(syncCallsList).forEach(pair => {
                // pair[0] and pair[1] are the functions that should be together
                let firstSet = [...syncCalls].find(set => set.has(pair[0]))
                let alreadySync = firstSet.has(pair[1])
                if (!alreadySync) {
                    let secondSet = [...syncCalls].find(set => set.has(pair[1]))
                    syncCalls.delete(secondSet);
                    [...secondSet].forEach(item => firstSet.add(item))
                }
            })
        }
    }

    console.log("----- Done Setting up, now finding new optimums.")
    console.log("syncCalls", syncCalls)
    // Compare setup and syncCalls to find possible improvements
    for (let i = 0; i < currentOptimalSetup.length; i++) {
        let fusionGroup = currentOptimalSetup[i]
        for (let fktn of fusionGroup) {
            console.log("Currently Trying function", fktn)

            //----------------------------------------------
            // Check if there are any functions that are in a sync set with a function that does not get called at all.
            console.log("Trying to find a function that is not called at all but in the same fusion group as", fktn)
            let fktnGroup = currentOptimalSetup.find(it => it.includes(fktn))
            console.log("Function Group is", fktnGroup)
            let fktnSyncSet = [...syncCalls].find(it => it.has(fktn))
            console.log("Function Sync Set is", fktnSyncSet)

            for (let j = 0; j < fktnGroup.length; j++) {
                let fktnInGroup = fktnGroup[j]
                if (!fktnSyncSet.has(fktnInGroup)) {
                    console.log(fktnInGroup, "should not be in the same fusionGroup as", fktn)
                    let i = currentOptimalSetup.findIndex(it => it.includes(fktn))
                    currentOptimalSetup[i] = fktnGroup.filter(item => item !== fktnInGroup)
                    currentOptimalSetup.push([fktnInGroup])
                    console.log("new Optimal Setup", setupFromList(currentOptimalSetup))

                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(currentOptimalSetup))
                    if (nullIfAlreadyTested && alreadyTested) {
                        console.log("Returning Null because it has already been tested")
                        return null

                    }

                    if (!alreadyTested) {
                        return setupFromList(currentOptimalSetup)
                    } else {
                        console.log("...was already")
                    }
                } else {
                    console.log("Function Sync Set contains function", fktnInGroup)
                }
            }

            // -------------------------------------
            // Create a new Set from an Array that is filtered, the array consists of the old set. Not very fast, but ES6 has no Filter() on Sets.
            // Get the Sync Set that has the function in it
            let syncSet = [...syncCalls].find(s => s.has(fktn))
            if (syncSet === undefined) {
                // The function was not called, ignore it
                console.log("Skipping uncalled function", fktn)
                continue
            }
            let syncSetAsArray = [...syncSet]
            for (let j = 0; j < syncSetAsArray.length; j++) {
                let shouldBeSync = syncSetAsArray[j]
                console.log("Trying whether", shouldBeSync, "is already in fusion group", fusionGroup)
                console.log("Shouldbesync type:", typeof shouldBeSync)
                if (!fusionGroup.includes(shouldBeSync)) {
                    console.log("!!! Found one! FusionGroup", fusionGroup, "does not include", shouldBeSync, "!")
                    console.log("Old Optimal Setup: ", currentOptimalSetup)
                    // Found one! shouldBeSync should be in Fusion group, but its not.
                    // Remove shouldBeSync from other fusion group
                    for (let k = 0; k < currentOptimalSetup.length; k++) {
                        // Get the fusion group without the Item to be removed
                        let newGroup = currentOptimalSetup[k].filter(item => item !== shouldBeSync)
                        console.log("Current Group", currentOptimalSetup[k], "filtered down to", newGroup)
                        if (newGroup.length == 0) {
                            console.log("...Removing it")
                            // The group without the item is empty==> Remote it fully
                            // The Fusion Group is gone now, remove this element
                            currentOptimalSetup.splice(k, 1)
                        } else {
                            currentOptimalSetup[k] = newGroup
                        }
                    }
                    // Add to current fusion group
                    currentOptimalSetup[i].push(shouldBeSync)
                    console.log("New Optimal Setup: ", currentOptimalSetup)

                    // Was this setup already tested?
                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(currentOptimalSetup))

                    if (alreadyTested) {
                        // The iteration on the current lowest latency was already tested...
                        console.log("New Optimum has already been tested...")

                        if (nullIfAlreadyTested) {
                            return null
                        }

                        continue
                    }

                    return setupFromList(currentOptimalSetup)
                } else {
                    console.log("...It is already...")
                }
            }
            //----------------------------------------------
            // Done merging stuff to make it faster
            // Now: Try to move stuff that is async in different functions.
            let notSyncSet = [...syncCalls].find(s => !s.has(fktn))
            console.log("Not Sync Set is", notSyncSet)
            let notSyncSetAsArray = [...notSyncSet]
            for (let j = 0; j < notSyncSetAsArray.length; j++) {
                let shouldNotBeSync = notSyncSetAsArray[j]
                console.log("Trying whether", shouldNotBeSync, "is wrongly in fusion group", fusionGroup)
                if (fusionGroup.includes(shouldNotBeSync)) {
                    console.log("!!! Found one! FusionGroup", fusionGroup, "includes", shouldNotBeSync, ", but shouldn't!")
                    console.log("Old Optimal Setup: ", currentOptimalSetup)
                    // Found one! shouldNotBeSync should NOT be in Fusion group, but it is.
                    // Remote shouldNotBeSync from the fusion group
                    for (let k = 0; k < currentOptimalSetup.length; k++) {
                        let newGroup = currentOptimalSetup[k].filter(item => item !== shouldNotBeSync)
                        if (newGroup.length == 0) {
                            // The Fusion Group is gone now, remove this element
                            currentOptimalSetup.splice(k, 1)
                            k-- // Do the group with the new index k again. k++ of for loop will increase it, so subtract one here.
                        } else {
                            currentOptimalSetup[k] = newGroup
                        }
                    }
                    // Add to a new fusion group with this member
                    currentOptimalSetup.push([shouldNotBeSync])
                    console.log("New Optimal Setup: ", currentOptimalSetup)

                    // Was this setup already tested?
                    let alreadyTested = Object.keys(setupsTested).includes(setupFromList(currentOptimalSetup))

                    if (alreadyTested) {
                        // The iteration on the current lowest latency was already tested...
                        console.log("New Optimum has already been tested...")

                        if (nullIfAlreadyTested) {
                            console.log("Returning Null because it has already been tested")
                            return null
                        }

                        continue
                    }

                    return setupFromList(currentOptimalSetup)
                } else {
                    console.log("...It is already...")
                }
            }
        }
    }
    console.log("Cannot find anything to improve")
    // There is nothing that can be fused from the current function
    return null
}
console.log(iterateOnLowestLatency(input, false))
