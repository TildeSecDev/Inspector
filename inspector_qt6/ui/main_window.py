"""
Main application window for Inspector Twin
"""
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QStackedWidget,
    QToolBar, QStatusBar, QMessageBox, QFileDialog, QPushButton, QLabel
)
from PyQt6.QtCore import Qt, QSettings
from PyQt6.QtGui import QAction, QIcon, QCloseEvent
from inspector_qt6.pages.projects_page import ProjectsPage
from inspector_qt6.pages.project_detail_page import ProjectDetailPage
from inspector_qt6.pages.reports_page import ReportsPage
from inspector_qt6.pages.settings_page import SettingsPage
from inspector_qt6.ui.styles import (
    SIDEBAR_STYLESHEET, SIDEBAR_TITLE_STYLESHEET, SIDEBAR_BUTTON_STYLESHEET,
    WARNING_BOX_STYLESHEET, WARNING_TITLE_STYLESHEET, WARNING_TEXT_STYLESHEET
)
from inspector_qt6.models.topology import Topology
from inspector_qt6.core.topology_utils import (
    export_topology_json, export_topology_yaml,
    validate_topology
)
import json
from typing import Optional, Dict, Any


class NavButton(QPushButton):
    """Styled navigation button for sidebar"""
    
    def __init__(self, text: str, parent=None):
        super().__init__(text, parent)
        self.setCheckable(True)
        self.setStyleSheet(SIDEBAR_BUTTON_STYLESHEET)


class MainWindow(QMainWindow):
    """Main application window with sidebar navigation"""
    
    def __init__(self):
        super().__init__()
        self.current_topology = Topology(name="Untitled")
        self.current_file = None
        self.current_project: Optional[Dict[str, Any]] = None
        self.settings = QSettings("TildeSec", "InspectorTwin")
        self.nav_buttons = []
        
        self.init_ui()
        self.restore_state()
    
    def init_ui(self):
        """Initialize the user interface"""
        self.setWindowTitle("Inspector Twin - PyQt6 Edition")
        self.setGeometry(100, 100, 1400, 800)
        
        # Create central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Left sidebar navigation
        sidebar = QWidget()
        sidebar.setStyleSheet(SIDEBAR_STYLESHEET)
        sidebar.setFixedWidth(220)
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(0, 0, 0, 0)
        sidebar_layout.setSpacing(0)
        
        # App title in sidebar
        title_label = QLabel("Inspector Twin")
        title_label.setStyleSheet(SIDEBAR_TITLE_STYLESHEET)
        sidebar_layout.addWidget(title_label)
        
        # Navigation buttons (Projects, Reports, Settings only - Twin Designer accessed via projects)
        nav_data = [
            ("📁  Projects", 0),
            ("📊  Reports", 1),
            ("⚙️  Settings", 2),
        ]
        
        for label, page_idx in nav_data:
            btn = NavButton(label)
            btn.clicked.connect(lambda checked, idx=page_idx: self.navigate_to_page(idx))
            self.nav_buttons.append(btn)
            sidebar_layout.addWidget(btn)
        
        sidebar_layout.addStretch()
        
        # Warning box at bottom of sidebar
        warning_box = QWidget()
        warning_box.setStyleSheet(WARNING_BOX_STYLESHEET)
        warning_layout = QVBoxLayout(warning_box)
        warning_layout.setContentsMargins(12, 12, 12, 12)
        warning_layout.setSpacing(5)
        
        warning_title = QLabel("⚠️  Authorized Testing Only")
        warning_title.setStyleSheet(WARNING_TITLE_STYLESHEET)
        warning_layout.addWidget(warning_title)
        
        warning_text = QLabel("Inspector Twin is designed for simulation and authorized local testing only. Do not use it to target real systems without written permission.")
        warning_text.setWordWrap(True)
        warning_text.setStyleSheet(WARNING_TEXT_STYLESHEET)
        warning_layout.addWidget(warning_text)
        
        sidebar_layout.addWidget(warning_box)
        
        main_layout.addWidget(sidebar)
        
        # Stacked widget for pages
        self.pages = QStackedWidget()
        main_layout.addWidget(self.pages, stretch=1)
        
        # Create and add pages (Projects is page 0, then project detail as overlay)
        self.projects_page = ProjectsPage()
        self.projects_page.project_selected.connect(self.on_project_selected)
        self.pages.addWidget(self.projects_page)  # 0
        
        self.reports_page = ReportsPage()
        self.pages.addWidget(self.reports_page)  # 1
        
        self.settings_page = SettingsPage()
        self.pages.addWidget(self.settings_page)  # 2
        
        # Project detail page (accessed by selecting a project, not via sidebar)
        self.project_detail_page = ProjectDetailPage()
        self.project_detail_page.back_to_projects.connect(lambda: self.navigate_to_page(0))
        self.pages.addWidget(self.project_detail_page)  # 3
        
        # Set Projects as default
        self.navigate_to_page(0)
        
        # Create menus
        self.create_menus()
        
        # Status bar
        status_bar = self.statusBar()
        assert status_bar is not None
        status_bar.showMessage("Ready")
    
    def navigate_to_page(self, page_index: int):
        """Navigate to a specific page"""
        self.pages.setCurrentIndex(page_index)
        
        # Update nav button states (only for non-project-detail pages)
        if page_index < 3:  # Not project detail page
            for i, btn in enumerate(self.nav_buttons):
                btn.setChecked(i == page_index)
    
    def on_project_selected(self, project: Dict[str, Any]):
        """Handle project selection - open project detail view"""
        self.current_project = project
        self.project_detail_page.load_project(project)
        self.pages.setCurrentIndex(3)  # Show project detail page
        
        # Deselect all nav buttons when showing project detail
        for btn in self.nav_buttons:
            btn.setChecked(False)
    
    def create_menus(self):
        """Create application menus"""
        menubar = self.menuBar()
        assert menubar is not None
        
        # File menu
        file_menu = menubar.addMenu("&File")
        assert file_menu is not None
        
        new_action = QAction("&New Project", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(lambda: self.navigate_to_page(0))
        file_menu.addAction(new_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("E&xit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # View menu
        view_menu = menubar.addMenu("&View")
        assert view_menu is not None
        
        projects_action = QAction("&Projects", self)
        projects_action.triggered.connect(lambda: self.navigate_to_page(0))
        view_menu.addAction(projects_action)
        
        reports_action = QAction("&Reports", self)
        reports_action.triggered.connect(lambda: self.navigate_to_page(1))
        view_menu.addAction(reports_action)
        
        settings_action = QAction("&Settings", self)
        settings_action.triggered.connect(lambda: self.navigate_to_page(2))
        view_menu.addAction(settings_action)
        
        # Help menu
        help_menu = menubar.addMenu("&Help")
        assert help_menu is not None
        
        about_action = QAction("&About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def on_topology_changed(self):
        """Handle topology changes"""
        status_bar = self.statusBar()
        assert status_bar is not None
        status_bar.showMessage("Topology modified")
    
    def show_about(self):
        """Show about dialog"""
        QMessageBox.about(
            self,
            "About Inspector Twin",
            "<h3>Inspector Twin - PyQt6 Edition</h3>"
            "<p>Version 0.1.0</p>"
            "<p>Digital Twin Simulation and Security Assessment Platform</p>"
            "<p>Copyright © 2026 TildeSec</p>"
        )
    
    def restore_state(self):
        """Restore window state from settings"""
        geometry = self.settings.value("geometry")
        if geometry:
            self.restoreGeometry(geometry)
        
        state = self.settings.value("windowState")
        if state:
            self.restoreState(state)
    
    def closeEvent(self, a0: Optional[QCloseEvent]) -> None:
        """Handle window close event"""
        if a0 is None:
            return
        # Save window state
        self.settings.setValue("geometry", self.saveGeometry())
        self.settings.setValue("windowState", self.saveState())
        
        # TODO: Check for unsaved changes
        a0.accept()
