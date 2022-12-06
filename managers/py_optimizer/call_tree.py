import networkx as nx

# Sometimes the elements are too close together -> make weight>1
weight_factor = 1

def get_call_graph(df) -> nx.MultiDiGraph:
    """
    Pandas DF to NX Graph
    """
    G = nx.MultiDiGraph()
    for calls in df["calls"]:
        for call in calls:
            add_call_to_graph(G, call)

    # Set the 'weight' parameter for the graphs
    # Remove edges with no calls#
    edgelist = set(G.edges())
    for u,v in edgelist:
        #print(f'currently working on {u=} {v=}, {G.edges(u,v)=}')
        s = G.edges[u,v,"sync"]
        a = G.edges[u,v,"async"]
        
        if (len(s["local"]) + len(s["remote"])) == 0:
            #print(f'removing sync edge sync between {u=} and {v=} because {s=}')
            G.remove_edge(u,v,key="sync")
        else:
            G.edges[u,v,"sync"]['weight'] = (len(s["local"]) + len(s["remote"])) * weight_factor

        if (len(a["local"]) + len(a["remote"])) == 0:
            #print(f'removing async edge sync between {u=} and {v=} because {a=}')
            #print(f'it is currently: {G.edges[u,v,"async"]}')
            G.remove_edge(u,v,key="async")
        else:
            G.edges[u,v,"async"]['weight'] = (len(a["local"]) + len(a["remote"])) * weight_factor

    return G

def add_call_to_graph(G: nx.MultiDiGraph, call: dict):
    """
    Add a call (in dict-form) to an existing graph. Usedy by get_call_graph
    """
    c_from = call["caller"]
    c_to = call["called"]
    c_sync = "sync" if call["sync"] else "async"

    c_local = "local" if call["local"] else "remote"
    c_time = call["time"]

    G.add_node(c_from)
    G.add_node(c_to)
    G.add_edge(c_from, c_to, "sync")
    if G.edges[c_from, c_to, "sync"] == {}:
        G.edges[c_from, c_to, "sync"]["local"] = []
        G.edges[c_from, c_to, "sync"]["remote"] = []
    G.add_edge(c_from, c_to, "async")
    if G.edges[c_from, c_to, "async"] == {}:
        G.edges[c_from, c_to, "async"]["local"] = []
        G.edges[c_from, c_to, "async"]["remote"] = []

    G.edges[c_from, c_to, c_sync][c_local].append(c_time)

def create_graph_image(G: nx.MultiDiGraph):
    nx.drawing.nx_agraph.write_dot(G, "graph.dot")