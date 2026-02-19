"""
Settings Page - Application settings
Converted from apps/renderer/src/pages/SettingsPage.tsx
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QGroupBox, QFormLayout, QLineEdit, QSpinBox, QCheckBox,
    QListWidget, QListWidgetItem, QTextEdit, QTabWidget, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from typing import Dict, List, Any


class SettingsPage(QWidget):
    """Page for application settings"""
    
    settings_changed = pyqtSignal(dict)
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(25)
        
        # Title
        title = QLabel("Settings")
        title.setStyleSheet("font-size: 28px; font-weight: bold; color: white; padding-bottom: 10px;")
        layout.addWidget(title)
        
        # Tab widget for different settings sections
        tabs = QTabWidget()
        
        # General settings
        general_tab = self.create_general_tab()
        tabs.addTab(general_tab, "General")
        
        # Network settings
        network_tab = self.create_network_tab()
        tabs.addTab(network_tab, "Network")
        
        # Docker settings
        docker_tab = self.create_docker_tab()
        tabs.addTab(docker_tab, "Docker")
        
        # Advanced settings
        advanced_tab = self.create_advanced_tab()
        tabs.addTab(advanced_tab, "Advanced")
        
        layout.addWidget(tabs)
        
        # Action buttons
        button_layout = QHBoxLayout()
        button_layout.setSpacing(15)
        button_layout.addStretch()
        
        save_btn = QPushButton("💾 Save Settings")
        save_btn.setMinimumHeight(45)
        save_btn.setMinimumWidth(150)
        save_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        save_btn.clicked.connect(self.save_settings)
        button_layout.addWidget(save_btn)
        
        reset_btn = QPushButton("🔄 Reset to Defaults")
        reset_btn.setMinimumHeight(45)
        reset_btn.setMinimumWidth(180)
        reset_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #34495e;
                color: white;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #4a5f7f;
            }
        """)
        reset_btn.clicked.connect(self.reset_settings)
        button_layout.addWidget(reset_btn)
        
        layout.addLayout(button_layout)
    
    def create_general_tab(self) -> QWidget:
        """Create general settings tab"""
        widget = QWidget()
        layout = QFormLayout(widget)
        
        self.app_name = QLineEdit("Inspector Twin")
        layout.addRow("Application Name:", self.app_name)
        
        self.auto_save = QCheckBox("Enable auto-save")
        self.auto_save.setChecked(True)
        layout.addRow("Auto-save:", self.auto_save)
        
        self.auto_save_interval = QSpinBox()
        self.auto_save_interval.setRange(30, 600)
        self.auto_save_interval.setValue(300)
        self.auto_save_interval.setSuffix(" seconds")
        layout.addRow("Auto-save interval:", self.auto_save_interval)
        
        return widget
    
    def create_network_tab(self) -> QWidget:
        """Create network settings tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Network endpoints
        endpoints_group = QGroupBox("API Endpoints")
        endpoints_layout = QVBoxLayout(endpoints_group)
        
        self.endpoints_list = QListWidget()
        endpoints_layout.addWidget(self.endpoints_list)
        
        endpoint_buttons = QHBoxLayout()
        add_endpoint_btn = QPushButton("Add Endpoint")
        add_endpoint_btn.clicked.connect(self.add_endpoint)
        endpoint_buttons.addWidget(add_endpoint_btn)
        
        remove_endpoint_btn = QPushButton("Remove")
        remove_endpoint_btn.clicked.connect(self.remove_endpoint)
        endpoint_buttons.addWidget(remove_endpoint_btn)
        
        test_endpoint_btn = QPushButton("Test Connection")
        test_endpoint_btn.clicked.connect(self.test_endpoint)
        endpoint_buttons.addWidget(test_endpoint_btn)
        
        endpoints_layout.addLayout(endpoint_buttons)
        layout.addWidget(endpoints_group)
        
        return widget
    
    def create_docker_tab(self) -> QWidget:
        """Create Docker settings tab"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        docker_group = QGroupBox("Docker Configuration")
        docker_layout = QFormLayout(docker_group)
        
        self.docker_host = QLineEdit("unix:///var/run/docker.sock")
        docker_layout.addRow("Docker Host:", self.docker_host)
        
        self.docker_api_version = QLineEdit("auto")
        docker_layout.addRow("API Version:", self.docker_api_version)
        
        layout.addWidget(docker_group)
        
        # Container management
        containers_group = QGroupBox("Active Containers")
        containers_layout = QVBoxLayout(containers_group)
        
        self.containers_list = QListWidget()
        containers_layout.addWidget(self.containers_list)
        
        container_buttons = QHBoxLayout()
        refresh_btn = QPushButton("Refresh")
        refresh_btn.clicked.connect(self.refresh_containers)
        container_buttons.addWidget(refresh_btn)
        
        stop_btn = QPushButton("Stop Selected")
        stop_btn.clicked.connect(self.stop_container)
        container_buttons.addWidget(stop_btn)
        
        containers_layout.addLayout(container_buttons)
        layout.addWidget(containers_group)
        
        layout.addStretch()
        return widget
    
    def create_advanced_tab(self) -> QWidget:
        """Create advanced settings tab"""
        widget = QWidget()
        layout = QFormLayout(widget)
        
        self.debug_mode = QCheckBox("Enable debug mode")
        layout.addRow("Debug:", self.debug_mode)
        
        self.log_level = QLineEdit("INFO")
        layout.addRow("Log Level:", self.log_level)
        
        self.max_log_size = QSpinBox()
        self.max_log_size.setRange(1, 1000)
        self.max_log_size.setValue(100)
        self.max_log_size.setSuffix(" MB")
        layout.addRow("Max Log Size:", self.max_log_size)
        
        return widget
    
    def save_settings(self):
        """Save current settings"""
        settings = {
            "app_name": self.app_name.text(),
            "auto_save": self.auto_save.isChecked(),
            "auto_save_interval": self.auto_save_interval.value(),
            "docker_host": self.docker_host.text(),
            "docker_api_version": self.docker_api_version.text(),
            "debug_mode": self.debug_mode.isChecked(),
            "log_level": self.log_level.text(),
            "max_log_size": self.max_log_size.value()
        }
        
        self.settings_changed.emit(settings)
        QMessageBox.information(self, "Success", "Settings saved successfully")
    
    def reset_settings(self):
        """Reset settings to defaults"""
        reply = QMessageBox.question(
            self,
            "Reset Settings",
            "Are you sure you want to reset all settings to defaults?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # Reset to defaults
            self.app_name.setText("Inspector Twin")
            self.auto_save.setChecked(True)
            self.auto_save_interval.setValue(300)
            self.docker_host.setText("unix:///var/run/docker.sock")
            self.docker_api_version.setText("auto")
            self.debug_mode.setChecked(False)
            self.log_level.setText("INFO")
            self.max_log_size.setValue(100)
            
            QMessageBox.information(self, "Success", "Settings reset to defaults")
    
    def add_endpoint(self):
        """Add a new API endpoint"""
        # TODO: Implement endpoint addition dialog
        pass
    
    def remove_endpoint(self):
        """Remove selected endpoint"""
        current = self.endpoints_list.currentItem()
        if current:
            self.endpoints_list.takeItem(self.endpoints_list.row(current))
    
    def test_endpoint(self):
        """Test connection to selected endpoint"""
        current = self.endpoints_list.currentItem()
        if current:
            QMessageBox.information(self, "Test", f"Testing connection to {current.text()}...")
    
    def refresh_containers(self):
        """Refresh Docker containers list"""
        # TODO: Implement Docker container listing
        self.containers_list.clear()
        QMessageBox.information(self, "Info", "Docker containers refreshed")
    
    def stop_container(self):
        """Stop selected Docker container"""
        current = self.containers_list.currentItem()
        if current:
            QMessageBox.information(self, "Info", f"Stopping container: {current.text()}")
