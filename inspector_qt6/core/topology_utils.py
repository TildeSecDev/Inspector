"""
Utility functions for topology management and YAML generation
Python port of the TypeScript topology-utils.ts
"""
import re
import json
from typing import Dict, List, Set, Tuple, Any
from inspector_qt6.models.topology import Topology, Node, Link


def topology_to_yaml(topology: Topology) -> str:
    """
    Converts topology to containerlab YAML format
    
    Args:
        topology: Topology object
    
    Returns:
        YAML string ready for containerlab
    """
    yaml_lines = [f"name: {topology.name}", "", "topology:"]
    
    # Add nodes
    yaml_lines.append("  nodes:")
    for node in topology.nodes:
        yaml_lines.append(f"    {node.id}:")
        yaml_lines.append(f"      kind: {node.kind}")
        
        if node.image:
            yaml_lines.append(f"      image: {node.image}")
        
        # Add exec commands
        if node.properties.exec:
            yaml_lines.append("      exec:")
            for cmd in node.properties.exec:
                yaml_lines.append(f"        - {escape_yaml_string(cmd)}")
        
        # Add environment variables
        if node.properties.env:
            yaml_lines.append("      env:")
            for key, value in node.properties.env.items():
                yaml_lines.append(f"        {key}: {escape_yaml_string(value)}")
        
        # Add binds/volumes
        if node.properties.binds:
            yaml_lines.append("      binds:")
            for bind in node.properties.binds:
                yaml_lines.append(f"        - {escape_yaml_string(bind)}")
    
    # Add links
    if topology.links:
        yaml_lines.append("  links:")
        for link in topology.links:
            source_endpoint = f"{link.source.deviceId}:{link.source.interface}"
            target_endpoint = f"{link.target.deviceId}:{link.target.interface}"
            yaml_lines.append(f'    - endpoints: ["{source_endpoint}", "{target_endpoint}"]')
    
    return "\n".join(yaml_lines)


def validate_topology(topology: Topology) -> Tuple[bool, List[str]]:
    """
    Validates topology against schema
    
    Args:
        topology: Topology object to validate
    
    Returns:
        Tuple of (valid, errors)
    """
    errors = []
    
    # Check required fields
    if not topology.name:
        errors.append("Topology name is required")
    
    if not topology.nodes:
        errors.append("At least one node is required")
    
    # Validate nodes
    node_ids = set()
    for node in topology.nodes:
        if not node.id:
            errors.append("Node missing id")
        if not node.kind:
            errors.append(f"Node {node.id} missing kind")
        if not node.name:
            errors.append(f"Node {node.id} missing name")
        
        if node.id in node_ids:
            errors.append(f"Duplicate node id: {node.id}")
        node_ids.add(node.id)
    
    # Validate links
    for idx, link in enumerate(topology.links):
        if not link.source.deviceId:
            errors.append(f"Link {idx} missing source deviceId")
        if not link.source.interface:
            errors.append(f"Link {idx} missing source interface")
        if not link.target.deviceId:
            errors.append(f"Link {idx} missing target deviceId")
        if not link.target.interface:
            errors.append(f"Link {idx} missing target interface")
        
        # Check if linked devices exist
        if link.source.deviceId not in node_ids:
            errors.append(f"Link {idx} references non-existent source device")
        if link.target.deviceId not in node_ids:
            errors.append(f"Link {idx} references non-existent target device")
    
    return len(errors) == 0, errors


def escape_yaml_string(s: str) -> str:
    """
    Escapes strings for YAML output
    
    Args:
        s: String to escape
    
    Returns:
        Escaped string
    """
    if not s:
        return '""'
    
    # Check if string needs quoting
    if (re.search(r'[:#\[\]\{\},&*!|>\'"%@`]', s) or 
        re.search(r'^\s|\s$', s) or 
        ': ' in s):
        # Use single quotes and escape single quotes
        return f"'{s.replace(\"'\", \"''\")}'"
    
    return s


def generate_node_id(name: str, existing_ids: Set[str] = None) -> str:
    """
    Generates unique node ID based on name
    
    Args:
        name: Node name
        existing_ids: Set of existing IDs
    
    Returns:
        Unique node ID
    """
    if existing_ids is None:
        existing_ids = set()
    
    node_id = re.sub(r'\s+', '-', name.lower())
    counter = 1
    
    original_id = node_id
    while node_id in existing_ids:
        node_id = f"{original_id}-{counter}"
        counter += 1
    
    return node_id


def generate_link_id(source_id: str, target_id: str, existing_ids: Set[str] = None) -> str:
    """
    Generates unique link ID based on endpoints
    
    Args:
        source_id: Source device ID
        target_id: Target device ID
        existing_ids: Set of existing IDs
    
    Returns:
        Unique link ID
    """
    if existing_ids is None:
        existing_ids = set()
    
    link_id = f"link-{source_id}-{target_id}"
    counter = 1
    
    original_id = link_id
    while link_id in existing_ids:
        link_id = f"{original_id}-{counter}"
        counter += 1
    
    return link_id


def check_interface_duplicates(topology: Topology) -> Tuple[bool, List[str]]:
    """
    Checks if a node has duplicate interface assignments
    
    Args:
        topology: Topology object
    
    Returns:
        Tuple of (has_duplicates, duplicates)
    """
    interface_usage: Dict[str, bool] = {}
    duplicates = []
    
    for link in topology.links:
        source_key = f"{link.source.deviceId}:{link.source.interface}"
        target_key = f"{link.target.deviceId}:{link.target.interface}"
        
        if source_key in interface_usage:
            duplicates.append(f"{source_key} already connected")
        if target_key in interface_usage:
            duplicates.append(f"{target_key} already connected")
        
        interface_usage[source_key] = True
        interface_usage[target_key] = True
    
    return len(duplicates) > 0, duplicates


def get_available_interfaces(topology: Topology, node_id: str, node: Node) -> List[str]:
    """
    Suggests available interfaces for a node
    
    Args:
        topology: Topology object
        node_id: Node ID
        node: Node object
    
    Returns:
        List of available interface names
    """
    used_interfaces = set()
    
    for link in topology.links:
        if link.source.deviceId == node_id:
            used_interfaces.add(link.source.interface)
        if link.target.deviceId == node_id:
            used_interfaces.add(link.target.interface)
    
    # Generate available interfaces based on device kind
    if node.kind == "rare":
        base_interfaces = [
            "ethernet1", "ethernet2", "ethernet3", "ethernet4",
            "ethernet5", "ethernet6", "ethernet7", "ethernet8"
        ]
    else:
        base_interfaces = ["eth0", "eth1", "eth2", "eth3", "eth4", "eth5"]
    
    return [iface for iface in base_interfaces if iface not in used_interfaces]


def export_topology_json(topology: Topology, filepath: str) -> None:
    """
    Exports topology as JSON file
    
    Args:
        topology: Topology object
        filepath: Output file path
    """
    with open(filepath, 'w') as f:
        json.dump(topology.to_dict(), f, indent=2)


def export_topology_yaml(topology: Topology, filepath: str) -> None:
    """
    Exports topology as YAML file
    
    Args:
        topology: Topology object
        filepath: Output file path
    """
    yaml_content = topology_to_yaml(topology)
    with open(filepath, 'w') as f:
        f.write(yaml_content)
