"""
Scenarios Page - Create and manage test scenarios
Defines security tests and simulation scenarios
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem,
    QPushButton, QLabel, QLineEdit, QTextEdit, QMessageBox, QDialog,
    QFormLayout, QDialogButtonBox, QFrame, QComboBox, QSpinBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from typing import Dict, Any, Optional


class ScenarioDialog(QDialog):
    """Dialog for creating/editing a scenario"""
    
    def __init__(self, scenario: Optional[Dict[str, Any]] = None, parent=None):
        super().__init__(parent)
        self.scenario = scenario or {}
        self.init_ui()
    
    def init_ui(self):
        """Initialize the dialog UI"""
        self.setWindowTitle("Scenario Details")
        self.setMinimumWidth(500)
        
        layout = QVBoxLayout(self)
        
        # Form layout
        form = QFormLayout()
        
        self.name_edit = QLineEdit(self.scenario.get("name", ""))
        self.name_edit.setPlaceholderText("Enter scenario name")
        form.addRow("Name:", self.name_edit)
        
        self.type_combo = QComboBox()
        self.type_combo.addItems([
            "Security Assessment",
            "Performance Test",
            "Penetration Test",
            "Load Test",
            "Failure Simulation",
            "Custom"
        ])
        current_type = self.scenario.get("type", "Security Assessment")
        self.type_combo.setCurrentText(current_type)
        form.addRow("Type:", self.type_combo)
        
        self.duration_spin = QSpinBox()
        self.duration_spin.setRange(1, 10000)
        self.duration_spin.setValue(self.scenario.get("duration", 60))
        self.duration_spin.setSuffix(" minutes")
        form.addRow("Duration:", self.duration_spin)
        
        self.description_edit = QTextEdit(self.scenario.get("description", ""))
        self.description_edit.setPlaceholderText("Describe the scenario objectives and steps")
        self.description_edit.setMaximumHeight(100)
        form.addRow("Description:", self.description_edit)
        
        self.commands_edit = QTextEdit(self.scenario.get("commands", ""))
        self.commands_edit.setPlaceholderText("Enter commands to execute (one per line)")
        self.commands_edit.setMaximumHeight(150)
        form.addRow("Commands:", self.commands_edit)
        
        layout.addLayout(form)
        
        # Dialog buttons
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | 
            QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
    
    def get_scenario(self) -> Dict[str, Any]:
        """Get the scenario data"""
        return {
            "name": self.name_edit.text(),
            "type": self.type_combo.currentText(),
            "duration": self.duration_spin.value(),
            "description": self.description_edit.toPlainText(),
            "commands": self.commands_edit.toPlainText(),
            "status": "draft"
        }


class ScenariosPage(QWidget):
    """Page for managing test scenarios"""
    
    scenario_selected = pyqtSignal(dict)
    run_scenario = pyqtSignal(dict)
    
    def __init__(self):
        super().__init__()
        self.scenarios = []
        self.init_ui()
    
    def init_ui(self):
        """Initialize the UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(25)
        
        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel("Test Scenarios")
        title.setStyleSheet("font-size: 28px; font-weight: bold; color: white;")
        header_layout.addWidget(title)
        
        header_layout.addStretch()
        
        new_btn = QPushButton("+ New Scenario")
        new_btn.setMinimumHeight(45)
        new_btn.setMinimumWidth(150)
        new_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        new_btn.clicked.connect(self.create_scenario)
        header_layout.addWidget(new_btn)
        
        layout.addLayout(header_layout)
        
        # Content area
        content_layout = QHBoxLayout()
        content_layout.setSpacing(25)
        
        # Left: Scenarios list
        list_container = QFrame()
        list_container.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Sunken)
        list_layout = QVBoxLayout(list_container)
        list_layout.setContentsMargins(15, 15, 15, 15)
        list_layout.setSpacing(10)
        
        list_label = QLabel("Scenarios")
        list_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #ecf0f1; padding: 5px;")
        list_layout.addWidget(list_label)
        
        self.scenarios_list = QListWidget()
        self.scenarios_list.itemClicked.connect(self.on_scenario_selected)
        list_layout.addWidget(self.scenarios_list)
        
        list_buttons = QHBoxLayout()
        list_buttons.setSpacing(10)
        
        edit_btn = QPushButton("Edit")
        edit_btn.setMinimumHeight(40)
        edit_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        edit_btn.clicked.connect(self.edit_scenario)
        list_buttons.addWidget(edit_btn)
        
        delete_btn = QPushButton("Delete")
        delete_btn.setMinimumHeight(40)
        delete_btn.setStyleSheet("""
            QPushButton {
                background-color: #c0392b;
                color: white;
                font-weight: bold;
                border-radius: 5px;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background-color: #e74c3c;
            }
            QPushButton:pressed {
                background-color: #a93226;
            }
        """)
        delete_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        delete_btn.clicked.connect(self.delete_scenario)
        list_buttons.addWidget(delete_btn)
        
        run_btn = QPushButton("▶ Run")
        run_btn.setMinimumHeight(40)
        run_btn.setStyleSheet("""
            QPushButton {
                background-color: #27ae60;
                color: white;
                font-weight: bold;
                border-radius: 5px;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background-color: #2ecc71;
            }
            QPushButton:pressed {
                background-color: #229954;
            }
        """)
        run_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        run_btn.clicked.connect(self.on_run_scenario)
        list_buttons.addWidget(run_btn)
        
        list_layout.addLayout(list_buttons)
        
        content_layout.addWidget(list_container, 1)
        
        # Right: Scenario details
        details_container = QFrame()
        details_container.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Sunken)
        details_layout = QVBoxLayout(details_container)
        details_layout.setContentsMargins(15, 15, 15, 15)
        details_layout.setSpacing(10)
        
        details_label = QLabel("Details")
        details_label.setStyleSheet("font-size: 16px; font-weight: bold; color: #ecf0f1; padding: 5px;")
        details_layout.addWidget(details_label)
        
        self.details_text = QTextEdit()
        self.details_text.setReadOnly(True)
        self.details_text.setPlaceholderText("Select a scenario to view details")
        details_layout.addWidget(self.details_text)
        
        content_layout.addWidget(details_container, 2)
        
        layout.addLayout(content_layout)
        
        # Add some example scenarios
        self.load_example_scenarios()
    
    def load_example_scenarios(self):
        """Load example scenarios"""
        examples = [
            {
                "name": "Basic Port Scan",
                "type": "Security Assessment",
                "duration": 30,
                "description": "Perform a basic port scan on all network devices",
                "commands": "nmap -sS 192.168.1.0/24\nnmap -sV -p- target",
                "status": "draft"
            },
            {
                "name": "DDoS Simulation",
                "type": "Failure Simulation",
                "duration": 60,
                "description": "Simulate a distributed denial of service attack",
                "commands": "hping3 -S --flood -p 80 target\nstress-ng --cpu 4 --timeout 60s",
                "status": "draft"
            }
        ]
        
        for scenario in examples:
            self.scenarios.append(scenario)
            item = QListWidgetItem(f"{scenario['name']} ({scenario['type']})")
            self.scenarios_list.addItem(item)
    
    def create_scenario(self):
        """Create a new scenario"""
        dialog = ScenarioDialog(parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            scenario = dialog.get_scenario()
            self.scenarios.append(scenario)
            item = QListWidgetItem(f"{scenario['name']} ({scenario['type']})")
            self.scenarios_list.addItem(item)
            self.scenarios_list.setCurrentItem(item)
            self.display_scenario_details(scenario)
    
    def edit_scenario(self):
        """Edit selected scenario"""
        current = self.scenarios_list.currentRow()
        if current >= 0:
            scenario = self.scenarios[current]
            dialog = ScenarioDialog(scenario, parent=self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
                updated = dialog.get_scenario()
                self.scenarios[current] = updated
                item = self.scenarios_list.item(current)
                if item:
                    item.setText(f"{updated['name']} ({updated['type']})")
                self.display_scenario_details(updated)
    
    def delete_scenario(self):
        """Delete selected scenario"""
        current = self.scenarios_list.currentRow()
        if current >= 0:
            scenario = self.scenarios[current]
            reply = QMessageBox.question(
                self,
                "Delete Scenario",
                f"Are you sure you want to delete '{scenario['name']}'?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                self.scenarios.pop(current)
                self.scenarios_list.takeItem(current)
                self.details_text.clear()
    
    def on_scenario_selected(self, item):
        """Handle scenario selection"""
        current = self.scenarios_list.currentRow()
        if current >= 0:
            scenario = self.scenarios[current]
            self.display_scenario_details(scenario)
            self.scenario_selected.emit(scenario)
    
    def display_scenario_details(self, scenario: Dict[str, Any]):
        """Display scenario details"""
        details = f"""
<h2>{scenario['name']}</h2>
<p><b>Type:</b> {scenario['type']}</p>
<p><b>Duration:</b> {scenario['duration']} minutes</p>
<p><b>Status:</b> {scenario['status'].title()}</p>

<h3>Description</h3>
<p>{scenario['description']}</p>

<h3>Commands</h3>
<pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">{scenario['commands']}</pre>
        """
        self.details_text.setHtml(details)
    
    def on_run_scenario(self):
        """Run selected scenario"""
        current = self.scenarios_list.currentRow()
        if current >= 0:
            scenario = self.scenarios[current]
            self.run_scenario.emit(scenario)
            QMessageBox.information(
                self,
                "Scenario Started",
                f"Running scenario: {scenario['name']}"
            )
