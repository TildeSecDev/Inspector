"""
Device Palette Widget - Provides device templates for drag-and-drop
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QListWidget, QListWidgetItem,
    QLabel, QPushButton, QGroupBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QDrag, QPixmap
from inspector_qt6.models.topology import Node, NodeProperties, UIProperties, Position
import json


class DevicePalette(QWidget):
    """Widget displaying available device templates"""
    
    device_selected = pyqtSignal(dict)
    
    def __init__(self):
        super().__init__()
        self.init_ui()
        self.load_devices()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        
        # Title
        title = QLabel("Device Templates")
        title.setStyleSheet("font-size: 14px; font-weight: bold; padding: 5px;")
        layout.addWidget(title)
        
        # Device list
        self.device_list = QListWidget()
        self.device_list.setDragEnabled(True)
        self.device_list.itemDoubleClicked.connect(self.on_device_double_clicked)
        layout.addWidget(self.device_list)
        
        # Instructions
        info_label = QLabel("Drag devices onto the canvas or double-click to add")
        info_label.setWordWrap(True)
        info_label.setStyleSheet("color: gray; font-size: 11px; padding: 5px;")
        layout.addWidget(info_label)
    
    def load_devices(self):
        """Load device templates"""
        devices = [
            {
                "name": "Router",
                "kind": "rare",
                "image": "ghcr.io/hellt/network-multitool",
                "color": "#4A90E2",
                "description": "FreRTR Router"
            },
            {
                "name": "Switch",
                "kind": "linux",
                "image": "ghcr.io/hellt/network-multitool",
                "color": "#50C878",
                "description": "Linux-based Switch"
            },
            {
                "name": "Linux Host",
                "kind": "linux",
                "image": "alpine:latest",
                "color": "#FFA500",
                "description": "Generic Linux Host"
            },
            {
                "name": "Server",
                "kind": "linux",
                "image": "nginx:alpine",
                "color": "#9370DB",
                "description": "Web Server"
            },
            {
                "name": "Firewall",
                "kind": "linux",
                "image": "ghcr.io/hellt/network-multitool",
                "color": "#DC143C",
                "description": "Network Firewall"
            }
        ]
        
        for device in devices:
            item = QListWidgetItem(f"{device['name']}\n{device['description']}")
            item.setData(Qt.ItemDataRole.UserRole, device)
            self.device_list.addItem(item)
    
    def on_device_double_clicked(self, item):
        """Handle device double click"""
        device_data = item.data(Qt.ItemDataRole.UserRole)
        self.device_selected.emit(device_data)
