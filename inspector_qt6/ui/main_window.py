"""
Main application window for Inspector Twin
"""
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QToolBar, QStatusBar, QMessageBox, QFileDialog, QDockWidget
)
from PyQt6.QtCore import Qt, QSettings
from PyQt6.QtGui import QAction, QIcon
from inspector_qt6.widgets.topology_canvas import TopologyCanvas
from inspector_qt6.widgets.device_palette import DevicePalette
from inspector_qt6.widgets.properties_panel import PropertiesPanel
from inspector_qt6.models.topology import Topology
from inspector_qt6.core.topology_utils import (
    export_topology_json, export_topology_yaml,
    validate_topology
)
import json


class MainWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        self.current_topology = Topology(name="Untitled")
        self.current_file = None
        self.settings = QSettings("TildeSec", "InspectorTwin")
        
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
        
        # Create splitter for resizable sections
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # Device Palette (left sidebar)
        self.device_palette = DevicePalette()
        palette_dock = QDockWidget("Device Palette", self)
        palette_dock.setWidget(self.device_palette)
        palette_dock.setFeatures(
            QDockWidget.DockWidgetFeature.DockWidgetMovable | 
            QDockWidget.DockWidgetFeature.DockWidgetFloatable
        )
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, palette_dock)
        
        # Topology Canvas (center)
        self.topology_canvas = TopologyCanvas()
        self.topology_canvas.topology_changed.connect(self.on_topology_changed)
        self.topology_canvas.node_selected.connect(self.on_node_selected)
        splitter.addWidget(self.topology_canvas)
        
        # Properties Panel (right sidebar)
        self.properties_panel = PropertiesPanel()
        self.properties_panel.properties_updated.connect(self.on_properties_updated)
        properties_dock = QDockWidget("Properties", self)
        properties_dock.setWidget(self.properties_panel)
        properties_dock.setFeatures(
            QDockWidget.DockWidgetFeature.DockWidgetMovable | 
            QDockWidget.DockWidgetFeature.DockWidgetFloatable
        )
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, properties_dock)
        
        # Create menus and toolbars
        self.create_menus()
        self.create_toolbars()
        
        # Status bar
        self.statusBar().showMessage("Ready")
    
    def create_menus(self):
        """Create application menus"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("&File")
        
        new_action = QAction("&New", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_topology)
        file_menu.addAction(new_action)
        
        open_action = QAction("&Open...", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_topology)
        file_menu.addAction(open_action)
        
        save_action = QAction("&Save", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_topology)
        file_menu.addAction(save_action)
        
        save_as_action = QAction("Save &As...", self)
        save_as_action.setShortcut("Ctrl+Shift+S")
        save_as_action.triggered.connect(self.save_topology_as)
        file_menu.addAction(save_as_action)
        
        file_menu.addSeparator()
        
        export_yaml_action = QAction("Export as &YAML...", self)
        export_yaml_action.triggered.connect(self.export_yaml)
        file_menu.addAction(export_yaml_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("E&xit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Edit menu
        edit_menu = menubar.addMenu("&Edit")
        
        validate_action = QAction("&Validate Topology", self)
        validate_action.setShortcut("Ctrl+V")
        validate_action.triggered.connect(self.validate_current_topology)
        edit_menu.addAction(validate_action)
        
        # View menu
        view_menu = menubar.addMenu("&View")
        
        zoom_in_action = QAction("Zoom &In", self)
        zoom_in_action.setShortcut("Ctrl++")
        zoom_in_action.triggered.connect(self.topology_canvas.zoom_in)
        view_menu.addAction(zoom_in_action)
        
        zoom_out_action = QAction("Zoom &Out", self)
        zoom_out_action.setShortcut("Ctrl+-")
        zoom_out_action.triggered.connect(self.topology_canvas.zoom_out)
        view_menu.addAction(zoom_out_action)
        
        reset_zoom_action = QAction("&Reset Zoom", self)
        reset_zoom_action.setShortcut("Ctrl+0")
        reset_zoom_action.triggered.connect(self.topology_canvas.reset_zoom)
        view_menu.addAction(reset_zoom_action)
        
        # Help menu
        help_menu = menubar.addMenu("&Help")
        
        about_action = QAction("&About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def create_toolbars(self):
        """Create application toolbars"""
        toolbar = QToolBar("Main Toolbar")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)
        
        # Add toolbar actions
        new_action = QAction("New", self)
        new_action.triggered.connect(self.new_topology)
        toolbar.addAction(new_action)
        
        open_action = QAction("Open", self)
        open_action.triggered.connect(self.open_topology)
        toolbar.addAction(open_action)
        
        save_action = QAction("Save", self)
        save_action.triggered.connect(self.save_topology)
        toolbar.addAction(save_action)
        
        toolbar.addSeparator()
        
        validate_action = QAction("Validate", self)
        validate_action.triggered.connect(self.validate_current_topology)
        toolbar.addAction(validate_action)
    
    def new_topology(self):
        """Create a new topology"""
        # TODO: Check for unsaved changes
        self.current_topology = Topology(name="Untitled")
        self.current_file = None
        self.topology_canvas.load_topology(self.current_topology)
        self.statusBar().showMessage("New topology created")
    
    def open_topology(self):
        """Open an existing topology file"""
        filename, _ = QFileDialog.getOpenFileName(
            self,
            "Open Topology",
            "",
            "JSON Files (*.json);;All Files (*)"
        )
        
        if filename:
            try:
                with open(filename, 'r') as f:
                    data = json.load(f)
                
                self.current_topology = Topology.from_dict(data)
                self.current_file = filename
                self.topology_canvas.load_topology(self.current_topology)
                self.statusBar().showMessage(f"Opened: {filename}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to open file:\n{str(e)}")
    
    def save_topology(self):
        """Save the current topology"""
        if self.current_file:
            try:
                self.current_topology = self.topology_canvas.get_topology()
                export_topology_json(self.current_topology, self.current_file)
                self.statusBar().showMessage(f"Saved: {self.current_file}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to save file:\n{str(e)}")
        else:
            self.save_topology_as()
    
    def save_topology_as(self):
        """Save the topology with a new filename"""
        filename, _ = QFileDialog.getSaveFileName(
            self,
            "Save Topology As",
            "",
            "JSON Files (*.json);;All Files (*)"
        )
        
        if filename:
            try:
                self.current_topology = self.topology_canvas.get_topology()
                export_topology_json(self.current_topology, filename)
                self.current_file = filename
                self.statusBar().showMessage(f"Saved: {filename}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to save file:\n{str(e)}")
    
    def export_yaml(self):
        """Export topology as YAML"""
        filename, _ = QFileDialog.getSaveFileName(
            self,
            "Export as YAML",
            "",
            "YAML Files (*.yml *.yaml);;All Files (*)"
        )
        
        if filename:
            try:
                self.current_topology = self.topology_canvas.get_topology()
                export_topology_yaml(self.current_topology, filename)
                self.statusBar().showMessage(f"Exported: {filename}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to export file:\n{str(e)}")
    
    def validate_current_topology(self):
        """Validate the current topology"""
        self.current_topology = self.topology_canvas.get_topology()
        valid, errors = validate_topology(self.current_topology)
        
        if valid:
            QMessageBox.information(
                self,
                "Validation Successful",
                "The topology is valid!"
            )
        else:
            error_text = "\n".join(f"• {error}" for error in errors)
            QMessageBox.warning(
                self,
                "Validation Errors",
                f"The topology has validation errors:\n\n{error_text}"
            )
    
    def on_topology_changed(self):
        """Handle topology changes"""
        self.statusBar().showMessage("Topology modified")
    
    def on_node_selected(self, node_id: str):
        """Handle node selection"""
        # Update properties panel with selected node
        node = next((n for n in self.current_topology.nodes if n.id == node_id), None)
        if node:
            self.properties_panel.load_node(node)
    
    def on_properties_updated(self, node_id: str, properties: dict):
        """Handle property updates"""
        self.topology_canvas.update_node_properties(node_id, properties)
    
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
    
    def closeEvent(self, event):
        """Handle window close event"""
        # Save window state
        self.settings.setValue("geometry", self.saveGeometry())
        self.settings.setValue("windowState", self.saveState())
        
        # TODO: Check for unsaved changes
        event.accept()
