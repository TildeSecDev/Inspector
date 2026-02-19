"""
Topology data models using Pydantic
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class Position(BaseModel):
    """Position coordinates for UI elements"""
    x: float = 0.0
    y: float = 0.0


class UIProperties(BaseModel):
    """UI-specific properties for nodes"""
    position: Position = Field(default_factory=Position)
    color: Optional[str] = None
    icon: Optional[str] = None


class NodeProperties(BaseModel):
    """Node properties for containerlab configuration"""
    exec: List[str] = Field(default_factory=list)
    env: Dict[str, str] = Field(default_factory=dict)
    binds: List[str] = Field(default_factory=list)


class Node(BaseModel):
    """Network node/device representation"""
    id: str
    name: str
    kind: str
    image: Optional[str] = None
    properties: NodeProperties = Field(default_factory=NodeProperties)
    ui: UIProperties = Field(default_factory=UIProperties)
    configurableFields: List[str] = Field(default_factory=list)


class LinkEndpoint(BaseModel):
    """Link endpoint specification"""
    deviceId: str
    interface: str


class Link(BaseModel):
    """Network link between two devices"""
    id: Optional[str] = None
    source: LinkEndpoint
    target: LinkEndpoint
    link_type: Optional[str] = None
    link_params: Dict[str, Any] = Field(default_factory=dict)


class Topology(BaseModel):
    """Complete network topology"""
    name: str
    nodes: List[Node] = Field(default_factory=list)
    links: List[Link] = Field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return self.model_dump()
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Topology":
        """Create topology from dictionary"""
        return cls.model_validate(data)
