"""
Basic tests for Inspector Twin PyQt6 Edition
"""
import pytest
from inspector_qt6.models.topology import (
    Topology, Node, Link, LinkEndpoint, 
    NodeProperties, UIProperties, Position
)
from inspector_qt6.core.topology_utils import (
    topology_to_yaml, validate_topology, generate_node_id,
    generate_link_id, escape_yaml_string
)


def test_node_creation():
    """Test creating a node"""
    node = Node(
        id="router1",
        name="Router 1",
        kind="rare",
        image="ghcr.io/hellt/network-multitool"
    )
    assert node.id == "router1"
    assert node.name == "Router 1"
    assert node.kind == "rare"


def test_topology_creation():
    """Test creating a topology"""
    topology = Topology(name="Test Network")
    assert topology.name == "Test Network"
    assert len(topology.nodes) == 0
    assert len(topology.links) == 0


def test_topology_with_nodes():
    """Test topology with nodes"""
    node1 = Node(id="r1", name="Router 1", kind="rare")
    node2 = Node(id="r2", name="Router 2", kind="rare")
    
    topology = Topology(
        name="Test Network",
        nodes=[node1, node2]
    )
    
    assert len(topology.nodes) == 2
    assert topology.nodes[0].id == "r1"
    assert topology.nodes[1].id == "r2"


def test_topology_with_links():
    """Test topology with links"""
    node1 = Node(id="r1", name="Router 1", kind="rare")
    node2 = Node(id="r2", name="Router 2", kind="rare")
    
    link = Link(
        source=LinkEndpoint(deviceId="r1", interface="eth0"),
        target=LinkEndpoint(deviceId="r2", interface="eth0")
    )
    
    topology = Topology(
        name="Test Network",
        nodes=[node1, node2],
        links=[link]
    )
    
    assert len(topology.links) == 1
    assert topology.links[0].source.deviceId == "r1"
    assert topology.links[0].target.deviceId == "r2"


def test_validate_topology_empty():
    """Test validation of empty topology"""
    topology = Topology(name="Test")
    valid, errors = validate_topology(topology)
    assert not valid
    assert "At least one node is required" in errors


def test_validate_topology_valid():
    """Test validation of valid topology"""
    node = Node(id="r1", name="Router 1", kind="rare")
    topology = Topology(name="Test Network", nodes=[node])
    
    valid, errors = validate_topology(topology)
    assert valid
    assert len(errors) == 0


def test_validate_topology_duplicate_ids():
    """Test validation catches duplicate node IDs"""
    node1 = Node(id="r1", name="Router 1", kind="rare")
    node2 = Node(id="r1", name="Router 2", kind="rare")  # Duplicate ID
    
    topology = Topology(name="Test Network", nodes=[node1, node2])
    valid, errors = validate_topology(topology)
    
    assert not valid
    assert any("Duplicate" in error for error in errors)


def test_validate_topology_invalid_link():
    """Test validation catches invalid links"""
    node1 = Node(id="r1", name="Router 1", kind="rare")
    link = Link(
        source=LinkEndpoint(deviceId="r1", interface="eth0"),
        target=LinkEndpoint(deviceId="r2", interface="eth0")  # r2 doesn't exist
    )
    
    topology = Topology(name="Test Network", nodes=[node1], links=[link])
    valid, errors = validate_topology(topology)
    
    assert not valid
    assert any("non-existent" in error for error in errors)


def test_topology_to_yaml():
    """Test YAML generation"""
    node = Node(id="r1", name="Router 1", kind="rare", image="test:latest")
    topology = Topology(name="Test Network", nodes=[node])
    
    yaml = topology_to_yaml(topology)
    
    assert "name: Test Network" in yaml
    assert "topology:" in yaml
    assert "nodes:" in yaml
    assert "r1:" in yaml
    assert "kind: rare" in yaml
    assert "image: test:latest" in yaml


def test_topology_to_yaml_with_links():
    """Test YAML generation with links"""
    node1 = Node(id="r1", name="Router 1", kind="rare")
    node2 = Node(id="r2", name="Router 2", kind="rare")
    link = Link(
        source=LinkEndpoint(deviceId="r1", interface="eth0"),
        target=LinkEndpoint(deviceId="r2", interface="eth1")
    )
    
    topology = Topology(name="Test Network", nodes=[node1, node2], links=[link])
    yaml = topology_to_yaml(topology)
    
    assert "links:" in yaml
    assert "endpoints:" in yaml
    assert "r1:eth0" in yaml
    assert "r2:eth1" in yaml


def test_generate_node_id():
    """Test node ID generation"""
    id1 = generate_node_id("My Router")
    assert id1 == "my-router"
    
    existing = {"my-router"}
    id2 = generate_node_id("My Router", existing)
    assert id2 == "my-router-1"


def test_generate_link_id():
    """Test link ID generation"""
    id1 = generate_link_id("r1", "r2")
    assert id1 == "link-r1-r2"
    
    existing = {"link-r1-r2"}
    id2 = generate_link_id("r1", "r2", existing)
    assert id2 == "link-r1-r2-1"


def test_escape_yaml_string():
    """Test YAML string escaping"""
    assert escape_yaml_string("simple") == "simple"
    assert escape_yaml_string("with: colon") == "'with: colon'"
    assert escape_yaml_string("with'quote") == "'with''quote'"
    assert escape_yaml_string("") == '""'


def test_node_properties():
    """Test node properties"""
    props = NodeProperties(
        exec=["ip addr", "ip route"],
        env={"KEY": "value"},
        binds=["/host:/container"]
    )
    
    node = Node(
        id="r1",
        name="Router",
        kind="rare",
        properties=props
    )
    
    assert len(node.properties.exec) == 2
    assert node.properties.env["KEY"] == "value"
    assert len(node.properties.binds) == 1


def test_ui_properties():
    """Test UI properties"""
    ui = UIProperties(
        position=Position(x=100.0, y=200.0),
        color="#FF0000"
    )
    
    node = Node(
        id="r1",
        name="Router",
        kind="rare",
        ui=ui
    )
    
    assert node.ui.position.x == 100.0
    assert node.ui.position.y == 200.0
    assert node.ui.color == "#FF0000"


def test_topology_to_dict():
    """Test topology serialization"""
    node = Node(id="r1", name="Router", kind="rare")
    topology = Topology(name="Test", nodes=[node])
    
    data = topology.to_dict()
    
    assert isinstance(data, dict)
    assert data["name"] == "Test"
    assert len(data["nodes"]) == 1


def test_topology_from_dict():
    """Test topology deserialization"""
    data = {
        "name": "Test",
        "nodes": [
            {
                "id": "r1",
                "name": "Router",
                "kind": "rare",
                "image": None,
                "properties": {"exec": [], "env": {}, "binds": []},
                "ui": {"position": {"x": 0, "y": 0}},
                "configurableFields": []
            }
        ],
        "links": []
    }
    
    topology = Topology.from_dict(data)
    
    assert topology.name == "Test"
    assert len(topology.nodes) == 1
    assert topology.nodes[0].id == "r1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
