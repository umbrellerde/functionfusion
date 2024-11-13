const JSZip = require("jszip");
const fs = require("fs/promises");

async function main() {
    console.log(" This script reads the file ./function.zip, deletes the tasks A and B from it, and saves this file to ./updatedFunction.zip")
    console.log(" Copy-Paste ./function.zip into this folder to start trying")
    let mainZip = new JSZip();
    let file = fs.readFile("./function.zip")
    await mainZip.loadAsync(await file); // Copy Pasted into this folder;
    let tasksToDelete = ["A", "B"];

    tasksToDelete.forEach(task => mainZip.remove("fusionables/" + task));

    let newZip = await mainZip.generateAsync({type:"nodebuffer"});
    fs.writeFile(`./updatedFunction.zip`, newZip)

}

main()