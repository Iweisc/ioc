# Graph Optimizer - Performs optimization passes on intent graphs

from typing import Dict, Set, List
from .graph import Graph, IntentNode, IntentType


class GraphOptimizer:
    """
    Performs various optimization passes on intent graphs.
    Transformations preserve semantics while improving performance.
    """
    
    def __init__(self, graph: Graph):
        self.graph = graph
        self.optimizations_applied: List[str] = []
    
    def optimize(self, passes: List[str] = None) -> Graph:
        """
        Apply optimization passes to the graph.
        
        Available passes:
        - dead_code_elimination: Remove unused nodes
        - filter_fusion: Combine adjacent filters
        - map_fusion: Combine adjacent maps
        - filter_before_map: Reorder filter before map when beneficial
        """
        if passes is None:
            passes = [
                "dead_code_elimination",
                "filter_fusion",
                "map_fusion",
                "filter_before_map"
            ]
        
        for pass_name in passes:
            if pass_name == "dead_code_elimination":
                self._dead_code_elimination()
            elif pass_name == "filter_fusion":
                self._filter_fusion()
            elif pass_name == "map_fusion":
                self._map_fusion()
            elif pass_name == "filter_before_map":
                self._filter_before_map()
            else:
                raise ValueError(f"Unknown optimization pass: {pass_name}")
        
        return self.graph
    
    def _dead_code_elimination(self):
        """Remove nodes that don't contribute to outputs."""
        # Find all nodes reachable from outputs
        reachable: Set[str] = set()
        
        def mark_reachable(node_id: str):
            if node_id in reachable:
                return
            reachable.add(node_id)
            node = self.graph.nodes[node_id]
            for input_id in node.inputs:
                mark_reachable(input_id)
        
        # Start from outputs
        for output_id in self.graph.outputs:
            mark_reachable(output_id)
        
        # Remove unreachable nodes
        all_nodes = set(self.graph.nodes.keys())
        dead_nodes = all_nodes - reachable
        
        if dead_nodes:
            for node_id in dead_nodes:
                del self.graph.nodes[node_id]
            self.optimizations_applied.append(f"dead_code_elimination: removed {len(dead_nodes)} nodes")
    
    def _filter_fusion(self):
        """Combine adjacent filter operations into a single filter."""
        changes_made = 0
        fused_nodes: Set[str] = set()
        
        # Find filter -> filter chains
        for node_id, node in list(self.graph.nodes.items()):
            if node.intent_type != IntentType.FILTER:
                continue
            
            if not node.inputs or node_id in fused_nodes:
                continue
            
            input_id = node.inputs[0]
            if input_id not in self.graph.nodes:
                continue
                
            input_node = self.graph.nodes[input_id]
            if input_node.intent_type != IntentType.FILTER or input_id in fused_nodes:
                continue
            
            # Fuse the two filters - capture immediately
            pred1 = input_node.params["predicate"]
            pred2 = node.params["predicate"]
            
            # Create combined predicate using default params to capture values
            def make_combined(p1, p2):
                def combined(x):
                    return p1(x) and p2(x)
                return combined
            
            combined_pred = make_combined(pred1, pred2)
            
            # Update current node to use combined predicate and skip input_node
            node.params["predicate"] = combined_pred
            node.inputs = input_node.inputs.copy()
            
            fused_nodes.add(input_id)
            changes_made += 1
        
        if changes_made > 0:
            self.optimizations_applied.append(f"filter_fusion: fused {changes_made} filter pairs")
            # Run dead code elimination to clean up
            self._dead_code_elimination()
    
    def _map_fusion(self):
        """Combine adjacent map operations into a single map."""
        changes_made = 0
        fused_nodes: Set[str] = set()
        
        # Find map -> map chains
        for node_id, node in list(self.graph.nodes.items()):
            if node.intent_type != IntentType.MAP:
                continue
            
            if not node.inputs or node_id in fused_nodes:
                continue
            
            input_id = node.inputs[0]
            if input_id not in self.graph.nodes:
                continue
                
            input_node = self.graph.nodes[input_id]
            if input_node.intent_type != IntentType.MAP or input_id in fused_nodes:
                continue
            
            # Fuse the two maps - capture the functions immediately
            transform1 = input_node.params["transform"]
            transform2 = node.params["transform"]
            
            # Create composed transformation: f(g(x)) using default params to capture values
            def make_composed(f1, f2):
                def composed(x):
                    return f2(f1(x))
                return composed
            
            composed_transform = make_composed(transform1, transform2)
            
            # Update current node to use composed transform and skip input_node
            node.params["transform"] = composed_transform
            node.inputs = input_node.inputs.copy()
            
            fused_nodes.add(input_id)
            changes_made += 1
        
        if changes_made > 0:
            self.optimizations_applied.append(f"map_fusion: fused {changes_made} map pairs")
            # Run dead code elimination to clean up
            self._dead_code_elimination()
    
    def _filter_before_map(self):
        """
        Reorder operations to do filter before map when beneficial.
        This reduces the number of elements that need transformation.
        """
        changes_made = 0
        
        # Find map -> filter chains where filter could go first
        for node_id, node in list(self.graph.nodes.items()):
            if node.intent_type != IntentType.FILTER:
                continue
            
            if not node.inputs:
                continue
            
            input_node = self.graph.nodes[node.inputs[0]]
            if input_node.intent_type != IntentType.MAP:
                continue
            
            # Check if filter predicate only depends on original data
            # (This is a simplified check - full implementation would need
            # dependency analysis)
            
            # For now, we can't automatically do this transformation safely
            # because the predicate might depend on the transformed values.
            # This would require analyzing the predicate to see if it only
            # uses properties preserved by the map.
            
            # This is left as a future enhancement with proper analysis
            pass
        
        if changes_made > 0:
            self.optimizations_applied.append(f"filter_before_map: reordered {changes_made} operations")
    
    def get_optimization_report(self) -> str:
        """Get a report of optimizations applied."""
        if not self.optimizations_applied:
            return "No optimizations applied"
        
        report = ["Optimization Report:", "=" * 50]
        for opt in self.optimizations_applied:
            report.append(f"  • {opt}")
        return "\n".join(report)
