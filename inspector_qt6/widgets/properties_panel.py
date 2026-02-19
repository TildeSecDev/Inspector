"""
Properties Panel Widget - Edit node properties
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QFormLayout, QLineEdit,
    QTextEdit, QLabel, QPushButton, QGroupBox, QScrollArea
)
from PyQt6.QtCore import pyqtSignal, Qt
from inspector_qt6.models.topology import Node


class PropertiesPanel(QWidget):
    """Widget for editing node properties"""
    
    properties_updated = pyqtSignal(str, dict)
    
    def __init__(self):
        super().__init__()
        self.current_node = None
        self.init_ui()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        
        # Title
        title = QLabel("Node Properties")
        title.setStyleSheet("font-size: 14px; font-weight: bold; padding: 5px;")
        layout.addWidget(title)
        
        # Scroll area for properties
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        layout.addWidget(scroll)
        
        # Properties widget
        props_widget = QWidget()
        scroll.setWidget(props_widget)
        self.props_layout = QFormLayout(props_widget)
        
        # Basic properties group
        basic_group = QGroupBox("Basic Properties")
        basic_layout = QFormLayout()
        basic_group.setLayout(basic_layout)
        
        self.name_input = QLineEdit()
        self.name_input.textChanged.connect(self.on_property_changed)
        basic_layout.addRow("Name:", self.name_input)
        
        self.id_label = QLabel()
        basic_layout.addRow("ID:", self.id_label)
        
        self.kind_input = QLineEdit()
        self.kind_input.textChanged.connect(self.on_property_changed)
        basic_layout.addRow("Kind:", self.kind_input)
        
        self.image_input = QLineEdit()
        self.image_input.textChanged.connect(self.on_property_changed)
        basic_layout.addRow("Image:", self.image_input)
        
        self.props_layout.addRow(basic_group)
        
        # Advanced properties group
        advanced_group = QGroupBox("Advanced Properties")
        advanced_layout = QFormLayout()
        advanced_group.setLayout(advanced_layout)
        
        self.exec_input = QTextEdit()
        self.exec_input.setMaximumHeight(100)
        self.exec_input.setPlaceholderText("One command per line")
        self.exec_input.textChanged.connect(self.on_property_changed)
        advanced_layout.addRow("Exec Commands:", self.exec_input)
        
        self.env_input = QTextEdit()
        self.env_input.setMaximumHeight(100)
        self.env_input.setPlaceholderText("KEY=VALUE (one per line)")
        self.env_input.textChanged.connect(self.on_property_changed)
        advanced_layout.addRow("Environment:", self.env_input)
        
        self.binds_input = QTextEdit()
        self.binds_input.setMaximumHeight(100)
        self.binds_input.setPlaceholderText("Volume binds (one per line)")
        self.binds_input.textChanged.connect(self.on_property_changed)
        advanced_layout.addRow("Binds:", self.binds_input)
        
        self.props_layout.addRow(advanced_group)
        
        # Apply button
        apply_button = QPushButton("Apply")
        apply_button.clicked.connect(self.apply_properties)
        layout.addWidget(apply_button)
        
        # Empty state
        self.empty_label = QLabel("Select a node to edit properties")
        self.empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_label.setStyleSheet("color: gray; padding: 20px;")
        layout.addWidget(self.empty_label)
        
        # Hide properties initially
        scroll.hide()
        apply_button.hide()
    
    def load_node(self, node: Node):
        """Load node properties into the panel"""
        self.current_node = node
        
        # Show properties widgets
        self.findChild(QScrollArea).show()
        self.findChildren(QPushButton)[0].show()
        self.empty_label.hide()
        
        # Populate fields
        self.name_input.setText(node.name)
        self.id_label.setText(node.id)
        self.kind_input.setText(node.kind)
        self.image_input.setText(node.image or "")
        
        # Exec commands
        self.exec_input.setPlainText("\n".join(node.properties.exec))
        
        # Environment variables
        env_text = "\n".join(f"{k}={v}" for k, v in node.properties.env.items())
        self.env_input.setPlainText(env_text)
        
        # Binds
        self.binds_input.setPlainText("\n".join(node.properties.binds))
    
    def on_property_changed(self):
        """Handle property change"""
        # Properties changed, can enable apply button or auto-apply
        pass
    
    def apply_properties(self):
        """Apply property changes"""
        if not self.current_node:
            return
        
        properties = {
            "name": self.name_input.text(),
            "kind": self.kind_input.text(),
            "image": self.image_input.text() or None,
            "properties": {
                "exec": [line.strip() for line in self.exec_input.toPlainText().split("\n") if line.strip()],
                "env": dict(
                    line.split("=", 1) for line in self.env_input.toPlainText().split("\n")
                    if "=" in line
                ),
                "binds": [line.strip() for line in self.binds_input.toPlainText().split("\n") if line.strip()]
            }
        }
        
        self.properties_updated.emit(self.current_node.id, properties)
