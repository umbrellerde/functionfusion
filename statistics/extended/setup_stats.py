import json
import os
import pandas as pd
import numpy as np
import seaborn as sns
from matplotlib import pyplot as plt
import matplotlib
from scipy.stats import t


sns.set(rc={'figure.figsize':(5,3)}, font_scale=1.0, style='whitegrid', font='CMU Sans Serif') # was 6,3
matplotlib.rcParams['pdf.fonttype'] = 42
matplotlib.rcParams['ps.fonttype'] = 42
plt.rc('axes', unicode_minus=False)

def save_fig(ax, name, file_type="pdf"):
    fig = ax.get_figure()
    fig.tight_layout()
    file_name = name + "." + file_type
    fig.savefig(os.path.join("graphs", file_name), bbox_inches='tight')

def get_df_grouped(results_dir):
    results_dir = "../../" + results_dir
    json_files = [pos_json for pos_json in os.listdir(results_dir) if "json" in pos_json and "configuration" not in pos_json]

    data = []
    for index, json_fn in enumerate(json_files):
        with open(os.path.join(results_dir, json_fn)) as in_file:
            fusion_group = json_fn.removesuffix('.json')
            content = json.load(in_file)
            #print(f'Read fusion group {fusion_group} with {len(content)} lines')
            data.extend(content)
    configuration_metadata = []
    with open(os.path.join(results_dir, "configuration/configurationMetadata.json")) as in_file:
        configuration_metadata = pd.DataFrame.from_dict(json.load(in_file))

    df = pd.DataFrame.from_dict(data)
    df["memoryAvail"] = pd.to_numeric(df["memoryAvail"])

    # Get the smallest Start timestamp and remove it from every timestamp value
    min_start_timestamp = df["startTimestamp"].min()
    df["startTimestamp"] = df["startTimestamp"] - min_start_timestamp
    df["endTimestamp"] = df["endTimestamp"] - min_start_timestamp
    df["duration"] =  df["endTimestamp"] - df["startTimestamp"]
    df["totalCost"] = 0.0000166667 * 0.000001 * df["memoryAvail"].astype(float) * df["billedDuration"].astype(float)

    # Now do not count every invocation, but sort the df by the cost of trace
    grouped = df.groupby('traceId').agg({'billedDuration': ['sum'], 'startTimestamp': ['min'], 'endTimestamp': ['max'], 'fusionGroup': 'min', 'totalCost': 'sum', 'memoryAvail': ['min']})
    #grouped['numInvocations'] = df.groupby('traceId').count()
    grouped['numInvocations'] = df.groupby('traceId').size()
    #print(f'Total Number of Invocations should be: {grouped["numInvocations"].sum()} == {len(df.index)}')

    # Grouped: Get Root Invocation of TraceId and get rootEndTimestamp
    # Pandas join() oder merge() machen mit dem alten Dataframe. Merge ist einfacher
    rootInvocations = df[df["isRootInvocation"]][["traceId", "endTimestamp"]].rename(columns={"endTimestamp": "rootEndTimestamp"})
    grouped = pd.merge(grouped, rootInvocations, how="left", on="traceId")
    grouped["rootDuration"] = grouped["rootEndTimestamp"] - grouped["startTimestamp", "min"]
    fusion_groups_order = pd.unique(grouped.sort_values(by="rootEndTimestamp")['fusionGroup', 'min'])

    return (df, grouped, fusion_groups_order)

def calculate_handler_overhead(df, name = ""):
    # df = df[df["actualInternalDuration"] >= 0]
    oh = df["duration"] - df["actualInternalDuration"]
    warm = oh[oh <= 10]#oh[df["isColdStart"] == False]
    cold = oh[oh > 10]#oh[df["isColdStart"] == True]
    print(f'{name}: mean: {oh.mean()} median: {oh.median()} stdev: {oh.std()} 25perc: {oh.quantile(0.25)} 75perc: {oh.quantile(0.75)} 90perc: {oh.quantile(0.90)} 99perc: {oh.quantile(0.99)} max:{oh.max()} len: {len(oh)} coldMean: {cold.mean()} coldStd: {cold.std()} warmMean: {warm.mean()} warmStd: {warm.std()}\n')
    sns.ecdfplot(data=df, x=df["duration"] - df["actualInternalDuration"])
    plt.show()

def prepare_diff_memory_cost(df, function_name, fixForSize = False, fixForSizeGroup = ""):
    invocations = df.loc[df["currentTask"] == function_name]
    if fixForSize:
        #invocations = invocations.query("fusionGroup == @fixForSizeGroup | memoryAvail != @fixForSizeSize")
        invocations["fusionGroup"] = pd.to_numeric(invocations["fusionGroup"])
        invocations = invocations.query("fusionGroup >= @fixForSizeGroup")
    #sizes = invocations["memoryAvail"].unique()
    return invocations
    # sns.ecdfplot(data=invocations, x="totalCost", hue="memoryAvail", palette=sns.color_palette("bright", 9))
    # plt.title(f"Total Cost for function {function_name}")
    # plt.xlabel("total cost [$]")
    # plt.show()
    # sns.lineplot(data=invocations, x="memoryAvail", y="totalCost")
    # plt.title(f"Cost depending on memory, function that uses two threads {function_name}")
    # plt.xlabel("memory available [MB]")
    # plt.show()
    # sns.ecdfplot(data=invocations, x="totalCost", hue="memoryAvail", palette=sns.color_palette("bright", 9))
    # plt.title(f"Cost depending on memory, function that uses two threads {function_name}")
    # plt.xlabel("memory available [MB]")
    # plt.show()

def printStats(grouped, fusion_groups_order):
    def printMeanAndCi(x, name=""):
        m = x.mean() 
        s = x.std() 
        dof = len(grouped)-1 
        confidence = 0.95

        t_crit = np.abs(t.ppf((1-confidence)/2,dof))
        print(f'Mean: {m}, Confidence Interval: ({m-s*t_crit/np.sqrt(len(x))} / {m+s*t_crit/np.sqrt(len(x))}), Median: {x.median()} for {name}')

    print("------ overall")
    printMeanAndCi(grouped["rootDuration"], "rootDuration")
    printMeanAndCi(grouped['billedDuration', 'sum'], "billedDuration")
    printMeanAndCi(grouped['totalCost', 'sum'], f'totalCost')
    for group in fusion_groups_order:
        filtered = grouped[grouped['fusionGroup', 'min'] == group]
        print("------ " + str(group) + "/" + str(filtered["fusionGroupLabel"].unique()))
        print(" minmem:", filtered['memoryAvail', 'min'].unique())
        printMeanAndCi(filtered["rootDuration"], f'rootDuration')
        printMeanAndCi(filtered['billedDuration', 'sum'], f'billedDuration')
        printMeanAndCi(filtered['totalCost', 'sum'], f'totalCost')

cmap = sns.color_palette("bright", as_cmap=True)