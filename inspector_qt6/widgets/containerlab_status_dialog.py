"""
Containerlab Status Dialog - Show lab status with filters and report export
"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTextEdit, QGroupBox, QCheckBox, QFileDialog
)
from PyQt6.QtCore import Qt
from typing import Dict, Any, Optional
import json
from pathlib import Path


class ContainerlabStatusDialog(QDialog):
    """Dialog showing containerlab status with filters"""
    
    def __init__(self, status_data: Dict[str, Any], parent=None):
        super().__init__(parent)
        self.status_data = status_data
        self.init_ui()
        self.update_view()
    
    def init_ui(self):
        """Initialize dialog UI"""
        self.setWindowTitle("Topology Status")
        self.setMinimumSize(700, 500)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)
        
        title = QLabel("Status")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #ecf0f1;")
        layout.addWidget(title)
        
        filter_group = QGroupBox("Filters")
        filter_layout = QHBoxLayout(filter_group)
        
        self.show_nodes = QCheckBox("Nodes")
        self.show_nodes.setChecked(True)
        self.show_nodes.stateChanged.connect(self.update_view)
        filter_layout.addWidget(self.show_nodes)
        
        self.show_links = QCheckBox("Links")
        self.show_links.setChecked(True)
        self.show_links.stateChanged.connect(self.update_view)
        filter_layout.addWidget(self.show_links)
        
        self.show_ips = QCheckBox("IPs")
        self.show_ips.setChecked(True)
        self.show_ips.stateChanged.connect(self.update_view)
        filter_layout.addWidget(self.show_ips)
        
        self.show_errors = QCheckBox("Errors")
        self.show_errors.setChecked(True)
        self.show_errors.stateChanged.connect(self.update_view)
        filter_layout.addWidget(self.show_errors)
        
        layout.addWidget(filter_group)
        
        self.output = QTextEdit()
        self.output.setReadOnly(True)
        self.output.setStyleSheet("""
            QTextEdit {
                background-color: #1a1a1a;
                color: #ecf0f1;
                border: 1px solid #34495e;
                border-radius: 5px;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
            }
        """)
        layout.addWidget(self.output)
        
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        report_btn = QPushButton("Generate Report")
        report_btn.setMinimumHeight(40)
        report_btn.clicked.connect(self.export_report)
        button_layout.addWidget(report_btn)
        
        close_btn = QPushButton("Close")
        close_btn.setMinimumHeight(40)
        close_btn.clicked.connect(self.accept)
        button_layout.addWidget(close_btn)
        
        layout.addLayout(button_layout)
    
    def update_view(self):
        """Update output based on filters"""
        lines = []
        
        if self.show_nodes.isChecked():
            nodes = self.status_data.get("nodes", [])
            lines.append("Nodes:")
            for node in nodes:
                name = node.get("name", "unknown")
                state = node.get("state", "unknown")
                image = node.get("image", "")
                lines.append(f"  - {name} [{state}] {image}")
            lines.append("")
        
        if self.show_links.isChecked():
            links = self.status_data.get("links", [])
            lines.append("Links:")
            for link in links:
                endpoints = link.get("endpoints", [])
                link_type = link.get("type", "veth")
                lines.append(f"  - {endpoints} (type: {link_type})")
            lines.append("")
        
        if self.show_ips.isChecked():
            ips = self.status_data.get("ips", [])
            lines.append("IPs:")
            for entry in ips:
                lines.append(f"  - {entry}")
            lines.append("")
        
        if self.show_errors.isChecked():
            errors = self.status_data.get("errors", [])
            if errors:
                lines.append("Errors:")
                for err in errors:
                    lines.append(f"  - {err}")
                lines.append("")
        
        if not lines:
            lines = ["No data available."]
        
        self.output.setPlainText("\n".join(lines))
    
    def export_report(self):
        """Export full status report to JSON"""
        path, _ = QFileDialog.getSaveFileName(
            self,
            "Save Status Report",
            str(Path.home() / "topology-status.json"),
            "JSON Files (*.json)"
        )
        if not path:
            return
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.status_data, f, indent=2)
