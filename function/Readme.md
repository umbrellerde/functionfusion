# Function

On startup, read the current configuration from env.

Call the functions locally or remotely depending on the current configuration.

## Fusion Group Detection

in `fusionables`, every folder that has a file called `handler.js` will be deployed as a fusionable function. The folder name can only contain alphanumerical chars as well as `_`. Attention: `,.-` are forbidden characters in the folder name!

The fusion handler will then run ```require(`./fusionables/${functionName}/handler`)``` to import the function.