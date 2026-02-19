"""
Projects Page - Manage projects
Converted from apps/renderer/src/pages/ProjectsPage.tsx
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem,
    QPushButton, QLabel, QLineEdit, QTextEdit, QMessageBox, QDialog,
    QFormLayout, QDialogButtonBox, QFrame
)
from PyQt6.QtCore import Qt, pyqtSignal
from typing import List, Dict, Any


class ProjectDialog(QDialog):
    """Dialog for creating a new project"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Create New Project")
        self.setMinimumWidth(400)
        
        layout = QFormLayout(self)
        
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Enter project name")
        layout.addRow("Name:", self.name_input)
        
        self.description_input = QTextEdit()
        self.description_input.setPlaceholderText("Enter project description (optional)")
        self.description_input.setMaximumHeight(100)
        layout.addRow("Description:", self.description_input)
        
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | 
            QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)
    
    def get_data(self):
        return {
            "name": self.name_input.text(),
            "description": self.description_input.toPlainText()
        }


class ProjectsPage(QWidget):
    """Page for managing projects"""
    
    project_selected = pyqtSignal(dict)
    
    def __init__(self):
        super().__init__()
        self.projects = []
        self.init_ui()
        self.load_projects()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        
        # Toolbar
        toolbar = QHBoxLayout()
        title = QLabel("Projects")
        title.setStyleSheet("font-size: 24px; font-weight: bold;")
        toolbar.addWidget(title)
        toolbar.addStretch()
        
        new_btn = QPushButton("New Project")
        new_btn.clicked.connect(self.show_create_dialog)
        toolbar.addWidget(new_btn)
        
        layout.addLayout(toolbar)
        
        # Project list
        self.project_list = QListWidget()
        self.project_list.itemDoubleClicked.connect(self.on_project_double_clicked)
        layout.addWidget(self.project_list)
        
        # Status label
        self.status_label = QLabel()
        self.status_label.setStyleSheet("color: gray; padding: 5px;")
        layout.addWidget(self.status_label)
    
    def load_projects(self):
        """Load projects from storage"""
        # TODO: Implement actual project loading from database
        self.project_list.clear()
        self.status_label.setText(f"Loaded {len(self.projects)} projects")
        
        for project in self.projects:
            item = QListWidgetItem(f"{project['name']}")
            item.setData(Qt.ItemDataRole.UserRole, project)
            self.project_list.addItem(item)
    
    def show_create_dialog(self):
        """Show dialog to create new project"""
        dialog = ProjectDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            data = dialog.get_data()
            if not data["name"]:
                QMessageBox.warning(self, "Error", "Project name is required")
                return
            
            self.create_project(data)
    
    def create_project(self, data: Dict[str, Any]):
        """Create a new project"""
        # TODO: Implement actual project creation
        import uuid
        from datetime import datetime
        
        project = {
            "id": str(uuid.uuid4()),
            "name": data["name"],
            "description": data["description"],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        self.projects.append(project)
        self.load_projects()
        QMessageBox.information(self, "Success", f"Project '{data['name']}' created successfully")
    
    def on_project_double_clicked(self, item: QListWidgetItem):
        """Handle project double click"""
        project = item.data(Qt.ItemDataRole.UserRole)
        self.project_selected.emit(project)
