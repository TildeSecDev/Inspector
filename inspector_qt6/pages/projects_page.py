"""
Projects Page - Manage projects
Converted from apps/renderer/src/pages/ProjectsPage.tsx
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QPushButton, QLabel, 
    QLineEdit, QTextEdit, QMessageBox, QDialog, QFormLayout, QDialogButtonBox, QFrame, QScrollArea
)
from PyQt6.QtCore import Qt, pyqtSignal
from inspector_qt6.ui.styles import PROJECT_CARD_STYLESHEET, DIALOG_STYLESHEET
from inspector_qt6.models.topology import (
    Topology, Node, Link, LinkEndpoint, UIProperties, Position, NodeProperties
)
from typing import List, Dict, Any
from datetime import datetime


class ProjectCard(QFrame):
    """Card widget for displaying a project"""
    
    clicked = pyqtSignal(dict)
    delete_requested = pyqtSignal(dict)
    
    def __init__(self, project: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.project = project
        self.init_ui()
    
    def init_ui(self):
        """Initialize the card UI"""
        self.setFrameStyle(QFrame.Shape.StyledPanel)
        self.setStyleSheet(PROJECT_CARD_STYLESHEET)
        self.setMinimumHeight(150)
        self.setMaximumHeight(200)
        self.setMinimumWidth(300)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(10)
        
        # Header with title and delete button
        header = QHBoxLayout()
        header.setSpacing(10)
        
        title = QLabel(self.project.get("name", "Untitled"))
        title.setStyleSheet("color: white; font-size: 16px; font-weight: bold; background: transparent;")
        header.addWidget(title)
        header.addStretch()
        
        delete_btn = QPushButton("X")
        delete_btn.setFixedSize(32, 32)
        delete_btn.setStyleSheet("""
            QPushButton {
                background-color: rgba(231, 76, 60, 0.2);
                border: none;
                font-size: 18px;
                font-weight: bold;
                border-radius: 16px;
                color: #e74c3c;
            }
            QPushButton:hover {
                background-color: #e74c3c;
                color: white;
            }
        """)
        delete_btn.clicked.connect(lambda: self.delete_requested.emit(self.project))
        header.addWidget(delete_btn)
        layout.addLayout(header)
        
        # Description
        desc = QLabel(self.project.get("description", ""))
        desc.setWordWrap(True)
        desc.setStyleSheet("color: #95a5a6; font-size: 13px; line-height: 1.4; background: transparent;")
        desc.setMinimumHeight(40)
        layout.addWidget(desc)
        
        layout.addStretch()
        
        # Footer with created date
        created = QLabel(f"Created: {self.project.get('created', 'Invalid Date')}")
        created.setStyleSheet("color: #7f8c8d; font-size: 11px; background: transparent;")
        layout.addWidget(created)
    
    def mousePressEvent(self, a0):
        """Handle click on card"""
        if a0 and a0.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self.project)
        super().mousePressEvent(a0)


class ProjectDialog(QDialog):
    """Dialog for creating a new project"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Create New Project")
        self.setMinimumWidth(500)
        self.setMinimumHeight(350)
        self.setStyleSheet(DIALOG_STYLESHEET)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(20)
        
        title = QLabel("Create New Project")
        title.setStyleSheet("font-size: 20px; font-weight: bold; margin-bottom: 10px; color: white;")
        layout.addWidget(title)
        
        # Name input
        name_label = QLabel("Project Name")
        name_label.setStyleSheet("color: #b0b0b0; font-size: 13px; margin-bottom: 5px;")
        layout.addWidget(name_label)
        
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Enter project name")
        self.name_input.setMinimumHeight(45)
        layout.addWidget(self.name_input)
        
        # Description input
        desc_label = QLabel("Description (optional)")
        desc_label.setStyleSheet("color: #b0b0b0; font-size: 13px; margin-bottom: 5px; margin-top: 10px;")
        layout.addWidget(desc_label)
        
        self.description_input = QTextEdit()
        self.description_input.setPlaceholderText("Enter project description")
        self.description_input.setMinimumHeight(120)
        layout.addWidget(self.description_input)
        
        layout.addStretch()
        
        # Buttons
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        cancel_btn = QPushButton("Cancel")
        cancel_btn.setStyleSheet("""
            QPushButton {
                background-color: #34495e;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                font-weight: 500;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #2c3e50;
            }
        """)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(cancel_btn)
        
        create_btn = QPushButton("Create Project")
        create_btn.setMinimumWidth(150)
        create_btn.clicked.connect(self.accept)
        button_layout.addWidget(create_btn)
        
        layout.addLayout(button_layout)
    
    def get_data(self):
        return {
            "name": self.name_input.text(),
            "description": self.description_input.toPlainText(),
            "created": datetime.now().strftime("%Y-%m-%d")
        }


class ProjectsPage(QWidget):
    """Page for managing projects"""
    
    project_selected = pyqtSignal(dict)
    
    def __init__(self):
        super().__init__()
        self.projects = self._create_default_projects()
        self.init_ui()
        self.load_projects()

    def _create_default_projects(self) -> List[Dict[str, Any]]:
        """Create default projects with preconfigured topologies"""
        created = datetime.now().strftime("%Y-%m-%d")
        
        return [
            {
                "name": "SME Office + Cloud App",
                "description": "Small-medium enterprise office network with cloud application infrastructure",
                "created": created,
                "topology": self._create_sme_topology()
            },
            {
                "name": "School Lab + Guest Wi-Fi Segmentation",
                "description": "Educational network with student lab and guest access",
                "created": created,
                "topology": self._create_school_topology()
            }
        ]

    def _create_sme_topology(self) -> Topology:
        """Create a sample SME office topology"""
        topology = Topology(name="sme-office")
        
        nodes = [
            Node(id="router1", name="Router", kind="router", image="frrouting/frr:latest",
                 ui=UIProperties(position=Position(x=200, y=100), color="#e74c3c")),
            Node(id="switch1", name="Core Switch", kind="switch", image="networkop/cx:latest",
                 ui=UIProperties(position=Position(x=200, y=260), color="#2ecc71")),
            Node(id="server1", name="App Server", kind="server", image="alpine:latest",
                 ui=UIProperties(position=Position(x=80, y=420), color="#3498db")),
            Node(id="pc1", name="Office PC", kind="workstation", image="alpine:latest",
                 ui=UIProperties(position=Position(x=320, y=420), color="#9b59b6")),
            Node(id="cloud1", name="Cloud App", kind="server", image="alpine:latest",
                 ui=UIProperties(position=Position(x=420, y=80), color="#f39c12")),
        ]
        topology.nodes.extend(nodes)
        
        links = [
            Link(source=LinkEndpoint(deviceId="router1", interface="eth0"),
                 target=LinkEndpoint(deviceId="switch1", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="switch1", interface="eth1"),
                 target=LinkEndpoint(deviceId="server1", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="switch1", interface="eth2"),
                 target=LinkEndpoint(deviceId="pc1", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="router1", interface="eth1"),
                 target=LinkEndpoint(deviceId="cloud1", interface="eth0")),
        ]
        topology.links.extend(links)
        
        return topology

    def _create_school_topology(self) -> Topology:
        """Create a sample school lab topology"""
        topology = Topology(name="school-lab")
        
        nodes = [
            Node(id="router1", name="Edge Router", kind="router", image="frrouting/frr:latest",
                 ui=UIProperties(position=Position(x=220, y=80), color="#e74c3c")),
            Node(id="switch1", name="Lab Switch", kind="switch", image="networkop/cx:latest",
                 ui=UIProperties(position=Position(x=220, y=220), color="#2ecc71")),
            Node(id="ap1", name="Guest WiFi", kind="server", image="alpine:latest",
                 ui=UIProperties(position=Position(x=420, y=220), color="#f39c12")),
            Node(id="lab1", name="Lab PC-1", kind="workstation", image="alpine:latest",
                 ui=UIProperties(position=Position(x=80, y=380), color="#9b59b6")),
            Node(id="lab2", name="Lab PC-2", kind="workstation", image="alpine:latest",
                 ui=UIProperties(position=Position(x=220, y=380), color="#9b59b6")),
            Node(id="lab3", name="Lab PC-3", kind="workstation", image="alpine:latest",
                 ui=UIProperties(position=Position(x=360, y=380), color="#9b59b6")),
        ]
        topology.nodes.extend(nodes)
        
        links = [
            Link(source=LinkEndpoint(deviceId="router1", interface="eth0"),
                 target=LinkEndpoint(deviceId="switch1", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="switch1", interface="eth1"),
                 target=LinkEndpoint(deviceId="lab1", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="switch1", interface="eth2"),
                 target=LinkEndpoint(deviceId="lab2", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="switch1", interface="eth3"),
                 target=LinkEndpoint(deviceId="lab3", interface="eth0")),
            Link(source=LinkEndpoint(deviceId="router1", interface="eth1"),
                 target=LinkEndpoint(deviceId="ap1", interface="eth0")),
        ]
        topology.links.extend(links)
        
        return topology
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(30)
        
        # Toolbar
        toolbar = QHBoxLayout()
        toolbar.setSpacing(20)
        
        title = QLabel("Projects")
        title.setStyleSheet("font-size: 32px; font-weight: bold; color: white;")
        toolbar.addWidget(title)
        toolbar.addStretch()
        
        new_btn = QPushButton("+ New Project")
        new_btn.setMinimumHeight(45)
        new_btn.setMinimumWidth(150)
        new_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        new_btn.clicked.connect(self.show_create_dialog)
        toolbar.addWidget(new_btn)
        
        layout.addLayout(toolbar)
        
        # Scroll area for project cards
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        
        scroll_content = QWidget()
        scroll_content.setStyleSheet("background-color: transparent;")
        self.project_grid = QGridLayout(scroll_content)
        self.project_grid.setSpacing(25)
        self.project_grid.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
    
    def load_projects(self):
        """Load projects from storage"""
        # Clear existing cards
        while self.project_grid.count():
            item = self.project_grid.takeAt(0)
            if item and item.widget():
                widget = item.widget()
                assert widget is not None
                widget.deleteLater()
        
        # Add project cards in grid (3 columns)
        for i, project in enumerate(self.projects):
            card = ProjectCard(project)
            card.clicked.connect(self.on_project_clicked)
            card.delete_requested.connect(self.on_delete_project)
            row = i // 3
            col = i % 3
            self.project_grid.addWidget(card, row, col)
    
    def on_project_clicked(self, project: Dict[str, Any]):
        """Handle project card click"""
        self.project_selected.emit(project)
    
    def show_create_dialog(self):
        """Show dialog to create new project"""
        dialog = ProjectDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            data = dialog.get_data()
            if data["name"]:
                self.projects.append(data)
                self.load_projects()
    
    def on_delete_project(self, project: Dict[str, Any]):
        """Handle project deletion"""
        reply = QMessageBox.question(
            self,
            "Delete Project",
            f"Are you sure you want to delete '{project['name']}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.projects.remove(project)
            self.load_projects()
