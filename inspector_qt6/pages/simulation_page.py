"""Simulation Page - Run and monitor simulations"""
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QTextEdit, QProgressBar, QHBoxLayout
from PyQt6.QtCore import Qt, pyqtSignal

class SimulationPage(QWidget):
    """Page for running simulations"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(25)
        
        title = QLabel("Simulation Runner")
        layout.addWidget(title)
        
        # Control buttons
        btn_layout = QHBoxLayout()
        start_btn = QPushButton("▶  Start Simulation")
        start_btn.setMinimumHeight(45)
        start_btn.setMinimumWidth(180)
        start_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        start_btn.setStyleSheet("""
            QPushButton {
                background-color: #27ae60;
                color: white;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #229954;
            }
        """)
        btn_layout.addWidget(start_btn)
        
        stop_btn = QPushButton("■  Stop")
        stop_btn.setMinimumHeight(45)
        stop_btn.setMinimumWidth(120)
        stop_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #e74c3c;
                color: white;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #c0392b;
            }
        """)
        btn_layout.addWidget(stop_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        # Progress
        self.progress = QProgressBar()
        layout.addWidget(self.progress)
        
        # Log output
        log_label = QLabel("Simulation Log:")
        layout.addWidget(log_label)
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setPlaceholderText("Simulation output will appear here...")
        layout.addWidget(self.log_text)
