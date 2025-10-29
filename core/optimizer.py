# Graph Optimizer - Performs optimization passes on intent graphs

from typing import Dict, Set, List
from .graph import Graph, IntentNode, IntentType


class GraphOptimizer:
    # Performs various optimization passes on intent graphs.
    # Transformations preserve semantics while improving performance.
    
    def __init__(self, graph: Graph):
        self.graph = graph
        self.optimizations_applied: List[str] = []
    
    def optimize(self, passes: List[str] = None) -> Graph:
        # Apply optimization passes to the graph.
        #
        # Available passes:
        # - dead_code_elimination: Remove unused nodes
        # - common_subexpression_elimination: Deduplicate identical computations
        # - filter_fusion: Combine adjacent filters
        # - map_fusion: Combine adjacent maps
        # - filter_before_map: Reorder filter before map when beneficial
        if passes is None:
            passes = [
                "dead_code_elimination",
                "common_subexpression_elimination",
                "filter_fusion",
                "map_fusion",
                "filter_before_map"
            ]
        
        for pass_name in passes:
            if pass_name == "dead_code_elimination":
                self._dead_code_elimination()
            elif pass_name == "common_subexpression_elimination":
                self._common_subexpression_elimination()
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
        # Remove nodes that don't contribute to outputs.
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
    
    def _common_subexpression_elimination(self):
        # Eliminate duplicate computations by reusing identical nodes.
        # Two nodes are considered identical if they have:
        # - Same intent type
        # - Same parameters (type_hint for constants, equal inputs, etc.)
        # - Same inputs
        changes_made = 0
        node_to_canonical: Dict[str, str] = {}  # Maps duplicate node IDs to canonical node ID
        
        # Group nodes by their "signature" to find duplicates
        def get_node_signature(node: IntentNode) -> tuple:
            # Create a hashable signature for a node
            # Note: We can't hash functions, so we use id() for params with functions
            sig_parts = [node.intent_type]
            
            # Add inputs to signature
            sig_parts.append(tuple(node.inputs))
            
            # Add params (but we can't compare functions reliably, so use their id)
            param_sig = []
            for key in sorted(node.params.keys()):
                value = node.params[key]
                if callable(value):
                    # For functions, we can't reliably compare, skip CSE for nodes with different functions
                    param_sig.append((key, id(value)))
                else:
                    param_sig.append((key, value))
            sig_parts.append(tuple(param_sig))
            
            return tuple(sig_parts)
        
        # Build signature map
        signature_to_nodes: Dict[tuple, List[str]] = {}
        for node_id, node in self.graph.nodes.items():
            sig = get_node_signature(node)
            if sig not in signature_to_nodes:
                signature_to_nodes[sig] = []
            signature_to_nodes[sig].append(node_id)
        
        # For each group of nodes with identical signatures, keep one and redirect others
        for sig, node_ids in signature_to_nodes.items():
            if len(node_ids) > 1:
                # Keep the first node as canonical
                canonical_id = node_ids[0]
                
                # For constant nodes, we can safely deduplicate even with different function objects
                # if their values are the same
                canonical_node = self.graph.nodes[canonical_id]
                if canonical_node.intent_type == IntentType.CONSTANT:
                    # Compare actual values
                    canonical_value = canonical_node.params.get("value")
                    for dup_id in node_ids[1:]:
                        dup_node = self.graph.nodes[dup_id]
                        dup_value = dup_node.params.get("value")
                        if canonical_value == dup_value:
                            node_to_canonical[dup_id] = canonical_id
                            changes_made += 1
                else:
                    # For other nodes, only deduplicate if they have the exact same function objects
                    # This is conservative but safe
                    canonical_params = canonical_node.params
                    duplicates = []
                    
                    for dup_id in node_ids[1:]:
                        dup_node = self.graph.nodes[dup_id]
                        # Check if all params are identical (including function identity)
                        if self._params_identical(canonical_params, dup_node.params):
                            duplicates.append(dup_id)
                    
                    for dup_id in duplicates:
                        node_to_canonical[dup_id] = canonical_id
                        changes_made += 1
        
        if changes_made > 0:
            # Redirect all references from duplicate nodes to canonical nodes
            for node_id, node in self.graph.nodes.items():
                # Update inputs to point to canonical nodes
                new_inputs = []
                for input_id in node.inputs:
                    if input_id in node_to_canonical:
                        new_inputs.append(node_to_canonical[input_id])
                    else:
                        new_inputs.append(input_id)
                node.inputs = new_inputs
            
            # Update outputs
            new_outputs = []
            for output_id in self.graph.outputs:
                if output_id in node_to_canonical:
                    canonical = node_to_canonical[output_id]
                    if canonical not in new_outputs:
                        new_outputs.append(canonical)
                else:
                    new_outputs.append(output_id)
            self.graph.outputs = new_outputs
            
            self.optimizations_applied.append(f"common_subexpression_elimination: deduplicated {changes_made} nodes")
            
            # Run dead code elimination to remove the now-unused duplicate nodes
            self._dead_code_elimination()
    
    def _params_identical(self, params1: dict, params2: dict) -> bool:
        # Check if two parameter dicts are identical (including function object identity)
        if set(params1.keys()) != set(params2.keys()):
            return False
        
        for key in params1:
            val1 = params1[key]
            val2 = params2[key]
            
            if callable(val1) and callable(val2):
                # For callables, check identity (same object)
                if val1 is not val2:
                    return False
            else:
                # For other values, check equality
                if val1 != val2:
                    return False
        
        return True
    
    def _filter_fusion(self):
        # Combine adjacent filter operations into a single filter.
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
        # Combine adjacent map operations into a single map.
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
        # Reorder operations to push expensive maps after cheap filters.
        # 
        # This optimization is DISABLED by default because it requires
        # sophisticated program analysis to be safe:
        #
        # Challenge: Given map(f) -> filter(p), we want filter(p') -> map(f)
        # where p'(x) evaluates to p(f(x)).
        #
        # This requires either:
        # 1. Inverting the transformation: p'(x) = p(f(x)) becomes p'(x) checks f⁻¹
        # 2. Rewriting the predicate to work on pre-transformed data
        # 3. Static analysis to detect when predicate is independent of transform
        #
        # All of these are complex and error-prone without proper tooling.
        #
        # Future enhancements could include:
        # - User annotations like @independent_of_transform
        # - Static analysis of AST to detect dependencies
        # - Profile-guided optimization with runtime validation
        # - Integration with symbolic execution
        #
        # For now, this pass is a no-op placeholder for future work.
        
        changes_made = 0
        
        # Placeholder for future implementation
        # When implemented, should:
        # 1. Find map -> filter patterns
        # 2. Analyze semantic dependencies
        # 3. Safely reorder when beneficial
        # 4. Validate correctness with differential testing
        
        if changes_made > 0:
            self.optimizations_applied.append(f"filter_before_map: reordered {changes_made} operations")
    
    def _count_consumers(self, node_id: str) -> int:
        # Count how many nodes use this node as input
        count = 0
        for other_node in self.graph.nodes.values():
            if node_id in other_node.inputs:
                count += 1
        # Also check if it's an output
        if node_id in self.graph.outputs:
            count += 1
        return count
    
    def get_optimization_report(self) -> str:
        # Get a report of optimizations applied.
        if not self.optimizations_applied:
            return "No optimizations applied"
        
        report = ["Optimization Report:"]
        for opt in self.optimizations_applied:
            report.append(f"  - {opt}")
        return "\n".join(report)
