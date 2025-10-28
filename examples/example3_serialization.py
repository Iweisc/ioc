# Example 3: Graph serialization to .iog files

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph


def serialize_graph(graph: Graph) -> dict:
    # Serialize graph to JSON-compatible dict
    serialized = {
        "version": "0.1.0",
        "nodes": {},
        "outputs": graph.outputs
    }
    
    for node_id, node in graph.nodes.items():
        node_data = {
            "id": node.id,
            "intent_type": node.intent_type.value,
            "inputs": node.inputs,
            "output_type": str(node.output_type),
            "metadata": node.metadata,
            "params": {}
        }
        
        # Serialize params (skip functions for now - would need proper serialization)
        for key, value in node.params.items():
            if callable(value):
                # In a real implementation, we'd serialize the function
                # (e.g., as bytecode, AST, or source)
                node_data["params"][key] = "<function>"
            else:
                node_data["params"][key] = value
        
        serialized["nodes"][node_id] = node_data
    
    return serialized


def main():
    print("Example 3: Graph Serialization")
    
    g = Graph()
    data = g.input("numbers", list)
    positive = g.filter(data, lambda x: x > 0)
    squared = g.map(positive, lambda x: x * x)
    g.output(squared)
    
    print("Intent graph:")
    print(g.visualize())
    
    serialized = serialize_graph(g)
    print("Serialized (.iog format):")
    print(json.dumps(serialized, indent=2))
    
    output_path = Path(__file__).parent / "square_positive.iog"
    with open(output_path, "w") as f:
        json.dump(serialized, f, indent=2)
    
    print(f"\nSaved to: {output_path}")


if __name__ == "__main__":
    main()
