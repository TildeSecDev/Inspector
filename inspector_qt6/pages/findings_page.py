"""Findings Page - View security findings and results"""
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QTableWidget, QTableWidgetItem, QPushButton, QHBoxLayout
from PyQt6.QtCore import Qt

class FindingsPage(QWidget):
    """Page for displaying security findings"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(25)
        
        # Header
        header_layout = QHBoxLayout()
        title = QLabel("Security Findings")
        title.setStyleSheet("font-size: 28px; font-weight: bold; color: white;")
        header_layout.addWidget(title)
        header_layout.addStretch()
        
        export_btn = QPushButton("📥  Export Findings")
        export_btn.setMinimumHeight(45)
        export_btn.setMinimumWidth(160)
        export_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        header_layout.addWidget(export_btn)
        layout.addLayout(header_layout)
        
        # Findings table
        self.findings_table = QTableWidget()
        self.findings_table.setColumnCount(5)
        self.findings_table.setHorizontalHeaderLabels(["Severity", "Type", "Target", "Description", "Status"])
        self.findings_table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(self.findings_table)
        
        # Add example findings
        self.load_example_findings()
    
    def load_example_findings(self):
        """Load example findings"""
        findings = [
            ["High", "Open Port", "192.168.1.100", "Port 22 (SSH) is open to internet", "Open"],
            ["Medium", "Weak Config", "Router-1", "Default credentials detected", "Review"],
            ["Low", "Information", "192.168.1.50", "Service version disclosure", "Acknowledged"],
        ]
        
        self.findings_table.setRowCount(len(findings))
        for i, finding in enumerate(findings):
            for j, value in enumerate(finding):
                item = QTableWidgetItem(value)
                self.findings_table.setItem(i, j, item)
