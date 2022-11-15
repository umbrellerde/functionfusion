#! /usr/bin/python
import json
import os
from typing import Any, Tuple
import pandas as pd
import numpy as np
import call_tree
import networkx as nx

configuration_metadata = {}
traces = {}
##########################################################

metadata_file = "/statistics/results/extendedTests/iot-configuration-metadata/iot-5.json"
traces_folder = "/statistics/results/extendedTests/iot-coldstarts-6xni"

base_path = os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
metadata_file_abs = base_path + metadata_file
traces_folder_abs = base_path + traces_folder + "/"

with open(metadata_file_abs) as f:
    configuration_metadata = json.load(f)

# Get a list of all JSON files in the traces folder and load them into the traces dictionary
def load_traces(traces):
    json_files = [pos_json for pos_json in os.listdir(traces_folder_abs) if pos_json.endswith(".json")]
    for json_file in json_files:
        with open(traces_folder_abs +  json_file) as f:
            dict_key = ".".join(json_file.split(".")[:-1])
            traces[dict_key] = json.load(f)
load_traces(traces)
###########################################################
cm = configuration_metadata

def init() -> tuple[pd.DataFrame, Any, Any, Any, nx.MultiDiGraph]:
    df = prepare_df(traces)
    function_names = get_all_function_names(cm)
    (ltacm, rtacm) = get_actual_call_matrix(df, function_names)
    G = call_tree.get_call_graph(df)
    return (df, function_names, ltacm, rtacm, G)

def get_from_df(df) -> tuple[Any, Any, Any, nx.MultiDiGraph]:
    function_names = get_all_function_names(cm)
    (ltacm, rtacm) = get_actual_call_matrix(df, function_names)
    G = call_tree.get_call_graph(df)
    return (function_names, ltacm, rtacm, G)


def optimize(event, context):
    (df, function_names, ltacm, rtacm, G) = init()
    #print(f'Got {len(configuration_metadata)} tested fusion setups, on to the next!')
    #print(f'Got {list(traces.keys())} Traces')
    
    #print("Dataframe")
    #print(df)
    print(f'All Functions by metadata: {function_names}')

    # local and remote actual TOTAL call matrix => All Calls
    #pretty_print_two_matrix(ltacm, rtacm, "Total ACM", function_names)


    # Get all calls that are withing a 

    # TODO save the new configuration to json and store in s3
    # TODO call optideployer

def prepare_df(traces):
    df = pd.DataFrame()
    for key in traces.keys():
        elements = traces[key]
        new_df = pd.DataFrame.from_dict(elements)
        df = pd.concat([df, new_df])
    return df

def get_actual_call_matrix(df, function_names):
    # From --> To
    local_calls = [[0 for _ in function_names] for _ in function_names]
    remote_calls = [[0 for _ in function_names] for _ in function_names]
    for calls in df["calls"]:
        for call in calls:
            callerI = function_names.index(call["caller"])
            calledI = function_names.index(call["called"])
            if call["local"]:
                local_calls[callerI][calledI] = local_calls[callerI][calledI] + 1
            else:
                remote_calls[callerI][calledI] = remote_calls[callerI][calledI] + 1
    # Normalize the values between 0 and 1 ???
                
    return (local_calls, remote_calls)

# From -> To is left to right
def pretty_print_call_matrix(m, name="", header=[]):
    print(name)
    print("\t" + "\t".join(header))
    for idx, call_from in enumerate(m):
        print(str(header[idx]) if len(header) > 0 else "", end="\t")
        for call_to in call_from:
            print(str(call_to) + "\t", end="")
        print("\n")

def pretty_print_two_matrix(lm, rm, name="", header=[]):
    print(name)
    print("     " + "\t\t".join(header))
    for idx in range(len(lm)):
        print(str(header[idx]).ljust(5) if len(header) > 0 else "", end="")
        for idy in range(len(lm[idx])):
            print(f'{lm[idx][idy]:03}//{rm[idx][idy]:03}\t', end="")
        print("\n")

def get_all_function_names(cm):
    # Unique Keys in the rules section of any (=the first) setup
    any_key = list(cm.keys())[0]
    any_rule = cm[any_key]
    rules_dict = any_rule["rules"]
    return list(rules_dict.keys())

if __name__ == "__main__":
    optimize({
        "timeout": 0
    }, {
        "aws_request_id": 12345
    })
