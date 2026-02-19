"""Project Detail Page - Shows Designer, Scenarios, Simulation Runner, Findings tabs for a project"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QTabWidget, QComboBox
)
from PyQt6.QtCore import Qt, pyqtSignal, QPointF
from PyQt6.QtGui import QFont
from inspector_qt6.pages.twin_designer_page import TwinDesignerPage
from inspector_qt6.pages.scenarios_page import ScenariosPage
from inspector_qt6.pages.simulation_page import SimulationPage
from inspector_qt6.pages.findings_page import FindingsPage
from inspector_qt6.ui.styles import PROJECT_HEADER_STYLESHEET
from inspector_qt6.models.topology import Node, Position, UIProperties, NodeProperties
from typing import Dict, Any
import uuid


class ProjectDetailPage(QWidget):
    """Detailed view of a project with Designer/Scenarios/Simulation/Findings tabs"""
    
    back_to_projects = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self.current_project = None
        self.init_ui()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Header with back button and project title
        header = QWidget()
        header.setStyleSheet(PROJECT_HEADER_STYLESHEET)
        header.setMinimumHeight(70)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(20, 15, 20, 15)
        header_layout.setSpacing(15)
        
        back_btn = QPushButton("←")
        back_btn.setFixedSize(45, 45)
        back_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        back_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 24px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #2980b9;
            }
            QPushButton:pressed {
                background-color: #21618c;
            }
        """)
        back_btn.clicked.connect(self.back_to_projects.emit)
        header_layout.addWidget(back_btn)
        
        self.project_title = QLabel("Project - New Topology")
        title_font = QFont()
        title_font.setPointSize(16)
        title_font.setBold(True)
        self.project_title.setFont(title_font)
        self.project_title.setStyleSheet("color: white; background: transparent;")
        header_layout.addWidget(self.project_title)
        header_layout.addStretch()
        
        # Action buttons
        self.device_combo = QComboBox()
        self.device_combo.addItems(["Server", "Router", "Switch", "Firewall", "Workstation"])
        self.device_combo.setMinimumWidth(150)
        self.device_combo.setMinimumHeight(40)
        self.device_combo.setCursor(Qt.CursorShape.PointingHandCursor)
        header_layout.addWidget(self.device_combo)
        
        self.add_node_btn = QPushButton("+ Add Node")
        self.add_node_btn.setMinimumHeight(40)
        self.add_node_btn.setMinimumWidth(120)
        self.add_node_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.add_node_btn.clicked.connect(self.add_node_to_canvas)
        header_layout.addWidget(self.add_node_btn)
        
        save_btn = QPushButton("💾  Save")
        save_btn.setMinimumHeight(40)
        save_btn.setMinimumWidth(100)
        save_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        header_layout.addWidget(save_btn)
        
        layout.addWidget(header)
        
        # Tab widget for different views
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        
        # Create tab pages
        self.designer_page = TwinDesignerPage()
        self.scenarios_page = ScenariosPage()
        self.simulation_page = SimulationPage()
        self.findings_page = FindingsPage()
        
        self.tabs.addTab(self.designer_page, "Designer")
        self.tabs.addTab(self.scenarios_page, "Scenarios")
        self.tabs.addTab(self.simulation_page, "Simulation Runner")
        self.tabs.addTab(self.findings_page, "Findings")
        
        layout.addWidget(self.tabs)
    
    def load_project(self, project: Dict[str, Any]):
        """Load a project for viewing/editing"""
        self.current_project = project
        project_name = project.get("name", "Untitled Project")
        self.project_title.setText(f"{project_name} - New Topology")
        
        # Load project data into designer if available
        if "topology" in project:
            topology = project["topology"]
            topology.name = project_name
            self.designer_page.load_topology(topology)
    
    def add_node_to_canvas(self):
        """Add a node to the canvas based on selected device type"""
        device_type = self.device_combo.currentText()
        
        # Create a new node
        node_id = str(uuid.uuid4())
        node = Node(
            id=node_id,
            name=f"{device_type}-{len(self.designer_page.topology_canvas.topology.nodes) + 1}",
            kind=device_type.lower(),
            image=self._get_default_image(device_type),
            properties=NodeProperties(),
            ui=UIProperties(
                position=Position(x=100.0, y=100.0),
                color=self._get_device_color(device_type)
            )
        )
        
        # Add to canvas
        self.designer_page.topology_canvas.add_node(node)
        
        # Switch to Designer tab if not already there
        self.tabs.setCurrentIndex(0)
    
    def _get_default_image(self, device_type: str) -> str:
        """Get default Docker image for device type"""
        images = {
            "Server": "alpine:latest",
            "Router": "frrouting/frr:latest",
            "Switch": "networkop/cx:latest",
            "Firewall": "alpine:latest",
            "Workstation": "alpine:latest"
        }
        return images.get(device_type, "alpine:latest")
    
    def _get_device_color(self, device_type: str) -> str:
        """Get color for device type"""
        colors = {
            "Server": "#3498db",  # Blue
            "Router": "#e74c3c",  # Red
            "Switch": "#2ecc71",  # Green
            "Firewall": "#f39c12",  # Orange
            "Workstation": "#9b59b6"  # Purple
        }
        return colors.get(device_type, "#4A90E2")
