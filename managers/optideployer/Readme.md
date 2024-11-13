Currently, every function has all the function code loaded, which might significantly increase cold starts etc. if some tasks are very big

This function changes the zip of all functions to only contain the tasks they actually need.