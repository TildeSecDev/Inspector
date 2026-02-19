"""
Home Page - Dashboard and quick actions
Main landing page for Inspector Twin application
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QGridLayout, QFrame, QScrollArea
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont


class QuickActionCard(QFrame):
    """Card widget for quick actions"""
    
    clicked = pyqtSignal(str)
    
    def __init__(self, title: str, description: str, action_id: str):
        super().__init__()
        self.action_id = action_id
        self.init_ui(title, description)
    
    def init_ui(self, title: str, description: str):
        """Initialize the card UI"""
        self.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Raised)
        self.setLineWidth(1)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setStyleSheet("""
            QuickActionCard {
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
            }
            QuickActionCard:hover {
                background-color: #f8f9fa;
                border-color: #4A90E2;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(10)
        
        title_label = QLabel(title)
        title_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        layout.addWidget(title_label)
        
        desc_label = QLabel(description)
        desc_label.setWordWrap(True)
        desc_label.setStyleSheet("color: #666;")
        layout.addWidget(desc_label)
    
    def mousePressEvent(self, a0):
        """Handle mouse press"""
        if a0 and a0.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self.action_id)


class StatCard(QFrame):
    """Card widget for displaying statistics"""
    
    def __init__(self, title: str, value: str, description: str = ""):
        super().__init__()
        self.init_ui(title, value, description)
    
    def init_ui(self, title: str, value: str, description: str):
        """Initialize the stat card UI"""
        self.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Raised)
        self.setLineWidth(1)
        self.setStyleSheet("""
            StatCard {
                background-color: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setSpacing(5)
        
        title_label = QLabel(title)
        title_label.setStyleSheet("color: #666; font-size: 12px;")
        layout.addWidget(title_label)
        
        value_label = QLabel(value)
        value_label.setFont(QFont("Arial", 24, QFont.Weight.Bold))
        value_label.setStyleSheet("color: #2c3e50;")
        layout.addWidget(value_label)
        
        if description:
            desc_label = QLabel(description)
            desc_label.setStyleSheet("color: #999; font-size: 11px;")
            layout.addWidget(desc_label)


class HomePage(QWidget):
    """Home page with dashboard and quick actions"""
    
    navigate_to = pyqtSignal(str)  # Signal to navigate to another page
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        """Initialize the UI"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(40, 40, 40, 40)
        main_layout.setSpacing(30)
        
        # Scroll area for content
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        
        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setSpacing(30)
        
        # Welcome section
        welcome_label = QLabel("Inspector Twin")
        welcome_label.setFont(QFont("Arial", 32, QFont.Weight.Bold))
        welcome_label.setStyleSheet("color: #2c3e50;")
        content_layout.addWidget(welcome_label)
        
        subtitle_label = QLabel("Digital Twin Simulation and Security Assessment Platform")
        subtitle_label.setFont(QFont("Arial", 14))
        subtitle_label.setStyleSheet("color: #7f8c8d; margin-bottom: 20px;")
        content_layout.addWidget(subtitle_label)
        
        # Statistics section
        stats_container = QWidget()
        stats_layout = QHBoxLayout(stats_container)
        stats_layout.setSpacing(20)
        
        self.projects_stat = StatCard("Projects", "0", "Active projects")
        self.topologies_stat = StatCard("Topologies", "0", "Designed networks")
        self.scenarios_stat = StatCard("Scenarios", "0", "Test scenarios")
        self.findings_stat = StatCard("Findings", "0", "Security findings")
        
        stats_layout.addWidget(self.projects_stat)
        stats_layout.addWidget(self.topologies_stat)
        stats_layout.addWidget(self.scenarios_stat)
        stats_layout.addWidget(self.findings_stat)
        stats_layout.addStretch()
        
        content_layout.addWidget(stats_container)
        
        # Separator
        separator = QFrame()
        separator.setFrameShape(QFrame.Shape.HLine)
        separator.setFrameShadow(QFrame.Shadow.Sunken)
        separator.setStyleSheet("background-color: #ddd;")
        content_layout.addWidget(separator)
        
        # Quick actions section
        actions_title = QLabel("Quick Actions")
        actions_title.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        actions_title.setStyleSheet("color: #2c3e50; margin-top: 10px;")
        content_layout.addWidget(actions_title)
        
        # Action cards grid
        actions_grid = QGridLayout()
        actions_grid.setSpacing(20)
        
        # Create New Project card
        new_project_card = QuickActionCard(
            "Create New Project",
            "Start a new digital twin project with custom topology design",
            "projects"
        )
        new_project_card.clicked.connect(self.on_action_clicked)
        actions_grid.addWidget(new_project_card, 0, 0)
        
        # Design Topology card
        design_topology_card = QuickActionCard(
            "Design Topology",
            "Use the visual editor to design network topologies",
            "designer"
        )
        design_topology_card.clicked.connect(self.on_action_clicked)
        actions_grid.addWidget(design_topology_card, 0, 1)
        
        # Create Scenario card
        create_scenario_card = QuickActionCard(
            "Create Scenario",
            "Define test scenarios and security assessments",
            "scenarios"
        )
        create_scenario_card.clicked.connect(self.on_action_clicked)
        actions_grid.addWidget(create_scenario_card, 1, 0)
        
        # View Reports card
        view_reports_card = QuickActionCard(
            "View Reports",
            "Access generated reports and analysis results",
            "reports"
        )
        view_reports_card.clicked.connect(self.on_action_clicked)
        actions_grid.addWidget(view_reports_card, 1, 1)
        
        content_layout.addLayout(actions_grid)
        content_layout.addStretch()
        
        scroll.setWidget(content_widget)
        main_layout.addWidget(scroll)
    
    def on_action_clicked(self, action_id: str):
        """Handle quick action click"""
        self.navigate_to.emit(action_id)
    
    def update_stats(self, projects: int = 0, topologies: int = 0, scenarios: int = 0, findings: int = 0):
        """Update statistics displays"""
        # Update stat cards (will need to access the value labels)
        # For now, this is a placeholder for future implementation
        pass
