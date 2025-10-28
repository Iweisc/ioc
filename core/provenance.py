# Provenance Tracking - Track origin and transformations of nodes

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import traceback


@dataclass
class SourceLocation:
    """Source code location where an intent was created."""
    file: str
    line: int
    function: str
    code: Optional[str] = None
    
    def __str__(self) -> str:
        return f"{self.file}:{self.line} in {self.function}"


@dataclass
class TransformationRecord:
    """Record of an optimization/transformation applied to a node."""
    transformation: str  # e.g., "filter_fusion", "map_fusion"
    original_nodes: List[str]  # Node IDs that were combined/removed
    description: str
    timestamp: float = field(default_factory=lambda: __import__('time').time())
    
    def __str__(self) -> str:
        return f"{self.transformation}: {self.description}"


@dataclass
class Provenance:
    """
    Complete provenance information for a node.
    Tracks where it came from, what transformations were applied, etc.
    """
    node_id: str
    source_location: Optional[SourceLocation] = None
    created_by: Optional[str] = None  # "user" or "optimizer"
    parent_nodes: List[str] = field(default_factory=list)  # Nodes this was derived from
    transformations: List[TransformationRecord] = field(default_factory=list)
    user_metadata: Dict[str, Any] = field(default_factory=dict)  # User-defined tags
    
    def add_transformation(self, transformation: TransformationRecord):
        """Record a transformation applied to this node."""
        self.transformations.append(transformation)
    
    def get_transformation_chain(self) -> List[str]:
        """Get the sequence of transformations that created this node."""
        return [str(t) for t in self.transformations]
    
    def is_optimized(self) -> bool:
        """Check if this node is a result of optimization."""
        return len(self.transformations) > 0
    
    def get_original_source(self) -> Optional[str]:
        """Get the original source location as a string."""
        if self.source_location:
            return str(self.source_location)
        return None


class ProvenanceTracker:
    """
    Tracks provenance information for all nodes in a graph.
    """
    
    def __init__(self):
        self.provenance_map: Dict[str, Provenance] = {}
    
    def track_node_creation(self, node_id: str, capture_stack: bool = True) -> Provenance:
        """
        Track creation of a new node, capturing source location.
        
        Args:
            node_id: ID of the node being created
            capture_stack: Whether to capture the call stack (expensive)
        """
        source_location = None
        
        if capture_stack:
            # Walk up the stack to find the user's code (not our framework code)
            stack = traceback.extract_stack()
            
            # Find the first frame that's not in our framework
            framework_files = ['graph.py', 'provenance.py', 'optimizer.py', 'kernel.py']
            
            for frame in reversed(stack[:-1]):  # Skip current frame
                if not any(fw in frame.filename for fw in framework_files):
                    source_location = SourceLocation(
                        file=frame.filename,
                        line=frame.lineno,
                        function=frame.name,
                        code=frame.line
                    )
                    break
        
        provenance = Provenance(
            node_id=node_id,
            source_location=source_location,
            created_by="user"
        )
        
        self.provenance_map[node_id] = provenance
        return provenance
    
    def track_optimization(self, result_node_id: str, transformation: str,
                          original_nodes: List[str], description: str):
        """
        Track an optimization that transforms/combines nodes.
        
        Args:
            result_node_id: The resulting node after optimization
            transformation: Name of the optimization (e.g., "filter_fusion")
            original_nodes: Nodes that were combined/replaced
            description: Human-readable description
        """
        if result_node_id not in self.provenance_map:
            # Create provenance for optimizer-generated node
            self.provenance_map[result_node_id] = Provenance(
                node_id=result_node_id,
                created_by="optimizer"
            )
        
        provenance = self.provenance_map[result_node_id]
        
        # Record the transformation
        record = TransformationRecord(
            transformation=transformation,
            original_nodes=original_nodes,
            description=description
        )
        provenance.add_transformation(record)
        
        # Track parent relationships
        for orig_id in original_nodes:
            if orig_id not in provenance.parent_nodes:
                provenance.parent_nodes.append(orig_id)
    
    def get_provenance(self, node_id: str) -> Optional[Provenance]:
        """Get provenance information for a node."""
        return self.provenance_map.get(node_id)
    
    def trace_back_to_source(self, node_id: str) -> List[Provenance]:
        """
        Trace a node back to its original user-created source nodes.
        Returns the chain of provenance from current node to original sources.
        """
        chain = []
        visited = set()
        
        def trace(nid: str):
            if nid in visited:
                return
            visited.add(nid)
            
            prov = self.get_provenance(nid)
            if prov:
                chain.append(prov)
                
                # Recursively trace parent nodes
                for parent_id in prov.parent_nodes:
                    trace(parent_id)
        
        trace(node_id)
        return chain
    
    def generate_error_report(self, node_id: str, error: Exception) -> str:
        """
        Generate a detailed error report showing provenance chain.
        
        This helps users understand where a runtime error originated.
        """
        lines = []
        lines.append(f"Error in node {node_id[:8]}...")
        lines.append(f"Error: {type(error).__name__}: {error}")
        lines.append("")
        
        prov = self.get_provenance(node_id)
        if not prov:
            lines.append("No provenance information available.")
            return "\n".join(lines)
        
        lines.append("Provenance Chain:")
        lines.append("-" * 60)
        
        # Show transformation history
        if prov.is_optimized():
            lines.append(f"Node was created by optimizer: {prov.created_by}")
            lines.append("Optimization history:")
            for i, trans in enumerate(prov.transformations, 1):
                lines.append(f"  {i}. {trans}")
        else:
            lines.append("Node was created by user code")
        
        # Show original source
        if prov.source_location:
            lines.append("")
            lines.append("Original source location:")
            lines.append(f"  File: {prov.source_location.file}")
            lines.append(f"  Line: {prov.source_location.line}")
            lines.append(f"  Function: {prov.source_location.function}")
            if prov.source_location.code:
                lines.append(f"  Code: {prov.source_location.code.strip()}")
        
        # Show parent nodes
        if prov.parent_nodes:
            lines.append("")
            lines.append("Derived from nodes:")
            for parent_id in prov.parent_nodes:
                parent_prov = self.get_provenance(parent_id)
                if parent_prov and parent_prov.source_location:
                    lines.append(f"  - {parent_id[:8]}... from {parent_prov.source_location}")
                else:
                    lines.append(f"  - {parent_id[:8]}...")
        
        return "\n".join(lines)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about tracked nodes."""
        total_nodes = len(self.provenance_map)
        user_created = sum(1 for p in self.provenance_map.values() if p.created_by == "user")
        optimizer_created = sum(1 for p in self.provenance_map.values() if p.created_by == "optimizer")
        optimized_nodes = sum(1 for p in self.provenance_map.values() if p.is_optimized())
        
        transformation_counts = {}
        for prov in self.provenance_map.values():
            for trans in prov.transformations:
                transformation_counts[trans.transformation] = \
                    transformation_counts.get(trans.transformation, 0) + 1
        
        return {
            "total_nodes": total_nodes,
            "user_created": user_created,
            "optimizer_created": optimizer_created,
            "optimized_nodes": optimized_nodes,
            "transformations": transformation_counts
        }
