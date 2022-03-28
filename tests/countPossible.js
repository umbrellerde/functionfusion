let listOfAll = []
const setupFromList = (list) => {
    if (list == null) {
        //console.log("list is null!")
        return null
    }
    return list.map(e => e.sort().join(".")).sort().join(",")
}
const listFromSetup = (setup) => setup.split(",").map(g => g.split("."))
function getNextPossibleConfiguration(functionNames) {

    // https://stackoverflow.com/questions/42773836
    function* subsets(array, offset = 0) {
        while (offset < array.length) {
            let first = array[offset++];
            for (let subset of subsets(array, offset)) {
                subset.push(first);
                yield subset;
            }
        }
        yield [];
    }

    /**
     * 
     * @param {*} deiniteGroups a list of lists with the set groups
     * @param {*} ungrouped a list of functions that still need to be grouped
     */
    function tryAllCombinations(definiteGroups, ungrouped) {
        let alreadyTested = (group) => {
            let res = listOfAll.includes(setupFromList(group))
            //console.log("Testing if ", group, "is in", listOfAll ,"tested:", res)
            return res
        }
        //console.log("Trying definite, upgrouped: ", definiteGroups, ungrouped)
        for (let subset of subsets(ungrouped)) {
            //console.log("...subset", subset)
            if (subset.length == 0) {
                //console.log("Skipping since subset is empty")
                continue
            }

            let restUngrouped = ungrouped.filter((name) => !subset.includes(name))
            let newDefiniteGroups = definiteGroups.slice()
            newDefiniteGroups.push(subset)

            if (restUngrouped.length == 0) {
                // All elements have been grouped
                // console.log("Testing definite Group:", newDefiniteGroups)
                // console.log("Setup is:", setupFromList(newDefiniteGroups))
                // console.log("AlreadyTested", alreadyTested(setupFromList(newDefiniteGroups)))
                // console.log("(Currently trying definite)", definiteGroups)
                // console.log("(Current Subset)", subset)
                if (!alreadyTested(newDefiniteGroups)) {
                    //console.log("Found untested", newDefiniteGroups)
                    //console.log("Adding new to list of all", setupFromList(newDefiniteGroups))
                    listOfAll.push(setupFromList(newDefiniteGroups))
                }
            } else {
                //console.log("...Since restUngrouped is not empty, going deeper")
                let subcombinations = tryAllCombinations(newDefiniteGroups, restUngrouped)
                if (subcombinations != null) {
                    return subcombinations
                }
                // There are no subcombinations
                // Continue trying
            }
        }
        //console.log("I have found nothing an i am all out of ideas")
        return null
    }
    return tryAllCombinations([], functionNames)
}

console.log(getNextPossibleConfiguration(["A", "B", "C", "D", "E", "F", "G"]))
console.log("--------------------------------")
console.log(listOfAll)
console.log("Total Length:", listOfAll.length)