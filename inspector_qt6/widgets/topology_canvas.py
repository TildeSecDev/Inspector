"""
Topology Canvas Widget - Visual editor for network topologies
"""
from PyQt6.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsItem, QGraphicsLineItem, QMenu
from PyQt6.QtCore import Qt, pyqtSignal, QPointF, QRectF, QLineF
from PyQt6.QtGui import QPainter, QPen, QBrush, QColor, QFont, QPaintDevice, QMouseEvent
from inspector_qt6.models.topology import Topology, Node, Link, Position, UIProperties, NodeProperties, LinkEndpoint
from typing import Optional
import uuid


class NodeItem(QGraphicsItem):
    """Graphical representation of a network node"""
    
    def __init__(self, node: Node):
        super().__init__()
        self.node = node
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsMovable)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsSelectable)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemSendsGeometryChanges)
        self.setPos(node.ui.position.x, node.ui.position.y)
        
        # Node appearance
        self.width = 80
        self.height = 60
        self.color = QColor(node.ui.color if node.ui.color else "#4A90E2")
    
    def boundingRect(self) -> QRectF:
        return QRectF(-self.width/2, -self.height/2, self.width, self.height)
    
    def paint(self, painter: Optional[QPainter], option, widget: Optional[QPaintDevice] = None):
        if painter is None:
            return
        # Draw node rectangle
        painter.setBrush(QBrush(self.color))
        painter.setPen(QPen(Qt.GlobalColor.black, 2))
        
        if self.isSelected():
            painter.setPen(QPen(Qt.GlobalColor.red, 3))
        
        painter.drawRoundedRect(self.boundingRect(), 5, 5)
        
        # Draw node name
        painter.setPen(QPen(Qt.GlobalColor.white))
        painter.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        painter.drawText(self.boundingRect(), Qt.AlignmentFlag.AlignCenter, self.node.name)
    
    def itemChange(self, change, value):
        if change == QGraphicsItem.GraphicsItemChange.ItemPositionChange:
            # Update node position
            new_pos = value
            self.node.ui.position.x = new_pos.x()
            self.node.ui.position.y = new_pos.y()
        
        return super().itemChange(change, value)


class LinkItem(QGraphicsItem):
    """Graphical representation of a network link"""
    
    def __init__(self, link: Link, source_item: NodeItem, target_item: NodeItem):
        super().__init__()
        self.link = link
        self.source_item = source_item
        self.target_item = target_item
        self.setZValue(-1)  # Draw behind nodes
    
    def boundingRect(self) -> QRectF:
        source_pos = self.source_item.pos()
        target_pos = self.target_item.pos()
        return QRectF(source_pos, target_pos).normalized().adjusted(-10, -10, 10, 10)
    
    def paint(self, painter: Optional[QPainter], option, widget: Optional[QPaintDevice] = None):
        if painter is None:
            return
        source_pos = self.source_item.pos()
        target_pos = self.target_item.pos()
        
        painter.setPen(QPen(Qt.GlobalColor.darkGray, 2))
        painter.drawLine(source_pos, target_pos)


class TopologyCanvas(QGraphicsView):
    """Canvas widget for editing network topologies"""
    
    topology_changed = pyqtSignal()
    node_selected = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        
        self._scene = QGraphicsScene()
        self.setScene(self._scene)
        
        # Configure view
        self.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.setDragMode(QGraphicsView.DragMode.RubberBandDrag)
        self.setViewportUpdateMode(QGraphicsView.ViewportUpdateMode.FullViewportUpdate)
        
        # Scene settings
        self._scene.setSceneRect(-1000, -1000, 2000, 2000)
        self._scene.setBackgroundBrush(QBrush(QColor("#F5F5F5")))
        
        # Topology data
        self.topology = Topology(name="Untitled")
        self.node_items = {}  # node_id -> NodeItem
        self.link_items = []  # List of LinkItems
        
        # Link creation state
        self.creating_link = False
        self.link_source_node = None
        self.temp_link_line = None
        self.link_mode_enabled = False
        self.link_type_options = []
        
        # Zoom settings
        self.zoom_factor = 1.0
        
        # Connect signals
        self._scene.selectionChanged.connect(self.on_selection_changed)

    def set_link_mode(self, enabled: bool):
        """Enable or disable link creation mode"""
        self.link_mode_enabled = enabled

    def set_link_type_options(self, options: list[dict]):
        """Set link type options for the link creation menu"""
        self.link_type_options = options
    
    def load_topology(self, topology: Topology):
        """Load a topology into the canvas"""
        self.topology = topology
        self.clear_canvas()
        
        # Create node items
        for node in topology.nodes:
            node_item = NodeItem(node)
            self._scene.addItem(node_item)
            self.node_items[node.id] = node_item
        
        # Create link items
        for link in topology.links:
            source_item = self.node_items.get(link.source.deviceId)
            target_item = self.node_items.get(link.target.deviceId)
            
            if source_item and target_item:
                link_item = LinkItem(link, source_item, target_item)
                self._scene.addItem(link_item)
                self.link_items.append(link_item)
    
    def get_topology(self) -> Topology:
        """Get the current topology"""
        return self.topology
    
    def clear_canvas(self):
        """Clear the canvas"""
        self._scene.clear()
        self.node_items.clear()
        self.link_items.clear()
    
    def add_node(self, node: Node, position: Optional[QPointF] = None):
        """Add a node to the canvas"""
        if position is not None:
            node.ui.position.x = position.x()
            node.ui.position.y = position.y()
        
        self.topology.nodes.append(node)
        
        node_item = NodeItem(node)
        self._scene.addItem(node_item)
        self.node_items[node.id] = node_item
        
        self.topology_changed.emit()
    
    def remove_node(self, node_id: str):
        """Remove a node from the canvas"""
        if node_id in self.node_items:
            node_item = self.node_items[node_id]
            self._scene.removeItem(node_item)
            del self.node_items[node_id]
            
            # Remove from topology
            self.topology.nodes = [n for n in self.topology.nodes if n.id != node_id]
            
            # Remove associated links
            self.topology.links = [
                l for l in self.topology.links
                if l.source.deviceId != node_id and l.target.deviceId != node_id
            ]
            
            self.topology_changed.emit()
    
    def update_node_properties(self, node_id: str, properties: dict):
        """Update node properties"""
        for node in self.topology.nodes:
            if node.id == node_id:
                # Update node properties
                for key, value in properties.items():
                    setattr(node, key, value)
                
                # Update visual representation
                if node_id in self.node_items:
                    self.node_items[node_id].update()
                
                self.topology_changed.emit()
                break
    
    def zoom_in(self):
        """Zoom in"""
        self.zoom_factor *= 1.2
        self.setTransform(self.transform().scale(1.2, 1.2))
    
    def zoom_out(self):
        """Zoom out"""
        self.zoom_factor /= 1.2
        self.setTransform(self.transform().scale(1/1.2, 1/1.2))
    
    def reset_zoom(self):
        """Reset zoom to 100%"""
        self.resetTransform()
        self.zoom_factor = 1.0
    
    def on_selection_changed(self):
        """Handle selection change"""
        selected_items = self._scene.selectedItems()
        if selected_items:
            item = selected_items[0]
            if isinstance(item, NodeItem):
                self.node_selected.emit(item.node.id)
    
    def mousePressEvent(self, event: Optional[QMouseEvent]) -> None:
        """Handle mouse press for link creation"""
        if event is None:
            return
        
        # Check if link mode, Ctrl key, or right-click is used for link creation
        if (self.link_mode_enabled or
            (event.modifiers() & Qt.KeyboardModifier.ControlModifier) or
            event.button() == Qt.MouseButton.RightButton):
            # Get item at mouse position
            pos = self.mapToScene(event.pos())
            item = self._scene.itemAt(pos, self.transform())
            
            if isinstance(item, NodeItem):
                # Start creating a link
                self.creating_link = True
                self.link_source_node = item
                self.setDragMode(QGraphicsView.DragMode.NoDrag)
                
                # Create temporary line
                self.temp_link_line = QGraphicsLineItem()
                self.temp_link_line.setPen(QPen(QColor("#3498db"), 2, Qt.PenStyle.DashLine))
                self.temp_link_line.setLine(QLineF(pos, pos))
                self._scene.addItem(self.temp_link_line)
                
                event.accept()
                return
        
        # Default behavior
        super().mousePressEvent(event)
    
    def mouseMoveEvent(self, event: Optional[QMouseEvent]) -> None:
        """Handle mouse move for link creation"""
        if event is None:
            return
        
        if self.creating_link and self.temp_link_line and self.link_source_node:
            # Update temporary line
            source_pos = self.link_source_node.scenePos()
            current_pos = self.mapToScene(event.pos())
            self.temp_link_line.setLine(QLineF(source_pos, current_pos))
            event.accept()
            return
        
        # Default behavior
        super().mouseMoveEvent(event)
    
    def mouseReleaseEvent(self, event: Optional[QMouseEvent]) -> None:
        """Handle mouse release for link creation"""
        if event is None:
            return
        
        if self.creating_link and self.link_source_node:
            # Get item at release position
            pos = self.mapToScene(event.pos())
            item = self._scene.itemAt(pos, self.transform())
            
            if isinstance(item, NodeItem) and item != self.link_source_node:
                # Choose link type and create link between nodes
                link_type = None
                link_params = {}
                interface_prefix = "eth"
                if self.link_type_options:
                    menu = QMenu(self)
                    for option in self.link_type_options:
                        action = menu.addAction(option["label"])
                        if action is not None:
                            action.setData(option)
                    selected = menu.exec(event.globalPosition().toPoint())
                    if selected is None:
                        # Cancelled selection
                        self._cleanup_link_drag()
                        return
                    option = selected.data()
                    link_type = option.get("link_type")
                    link_params = option.get("link_params", {})
                    interface_prefix = option.get("interface_prefix", "eth")
                
                # Create link between nodes
                self.create_link(
                    self.link_source_node.node.id,
                    item.node.id,
                    link_type=link_type,
                    link_params=link_params,
                    interface_prefix=interface_prefix
                )
            
            # Clean up temporary line
            self._cleanup_link_drag()
            event.accept()
            return
        
        # Default behavior
        super().mouseReleaseEvent(event)
    
    def create_link(
        self,
        source_id: str,
        target_id: str,
        link_type: Optional[str] = None,
        link_params: Optional[dict] = None,
        interface_prefix: str = "eth"
    ):
        """Create a link between two nodes"""
        # Check if link already exists
        for link in self.topology.links:
            if ((link.source.deviceId == source_id and link.target.deviceId == target_id) or
                (link.source.deviceId == target_id and link.target.deviceId == source_id)):
                return  # Link already exists
        
        # Get node items
        source_item = self.node_items.get(source_id)
        target_item = self.node_items.get(target_id)
        
        if not source_item or not target_item:
            return
        
        # Create link model
        source_iface = self._next_interface(source_id, interface_prefix)
        target_iface = self._next_interface(target_id, interface_prefix)
        link = Link(
            id=str(uuid.uuid4()),
            source=LinkEndpoint(deviceId=source_id, interface=source_iface),
            target=LinkEndpoint(deviceId=target_id, interface=target_iface),
            link_type=link_type,
            link_params=link_params or {}
        )
        
        self.topology.links.append(link)
        
        # Create visual link
        link_item = LinkItem(link, source_item, target_item)
        self._scene.addItem(link_item)
        self.link_items.append(link_item)
        
        self.topology_changed.emit()

    def _next_interface(self, node_id: str, prefix: str) -> str:
        """Compute next interface name for a node with a given prefix"""
        used = []
        for link in self.topology.links:
            if link.source.deviceId == node_id and link.source.interface.startswith(prefix):
                used.append(link.source.interface)
            if link.target.deviceId == node_id and link.target.interface.startswith(prefix):
                used.append(link.target.interface)
        
        index = 0
        while f"{prefix}{index}" in used:
            index += 1
        return f"{prefix}{index}"

    def _cleanup_link_drag(self):
        """Reset temporary link drag state"""
        if self.temp_link_line:
            self._scene.removeItem(self.temp_link_line)
            self.temp_link_line = None
        self.creating_link = False
        self.link_source_node = None
        self.setDragMode(QGraphicsView.DragMode.RubberBandDrag)
