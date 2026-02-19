"""
Authorization Warning Dialog for Inspector Twin
Appears on application startup as a modal overlay
"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QLabel, QPushButton, QWidget
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont


class AuthorizationWarningDialog(QDialog):
    """Modal dialog for authorization testing warning"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Authorized Testing Only")
        self.setModal(True)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
        
        # Make dialog semi-transparent with dark background overlay effect
        self.setStyleSheet("""
            QDialog {
                background-color: rgba(0, 0, 0, 0.7);
            }
        """)
        
        self.init_ui()
    
    def init_ui(self):
        """Initialize the dialog UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Create a centered content widget
        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(40, 40, 40, 40)
        content_layout.setSpacing(20)
        
        content_widget.setStyleSheet("""
            QWidget {
                background-color: #d97706;
                border-radius: 12px;
            }
        """)
        
        # Warning icon and title
        title_label = QLabel("⚠️  Authorized Testing Only")
        title_font = QFont()
        title_font.setPointSize(24)
        title_font.setBold(True)
        title_label.setFont(title_font)
        title_label.setStyleSheet("color: white; background: transparent;")
        content_layout.addWidget(title_label)
        
        # Warning message
        message_label = QLabel(
            "Inspector Twin is designed for simulation and authorized local testing only.\n\n"
            "Do not use it to target real systems without written permission."
        )
        message_font = QFont()
        message_font.setPointSize(14)
        message_label.setFont(message_font)
        message_label.setWordWrap(True)
        message_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        message_label.setMinimumHeight(80)
        message_label.setStyleSheet("color: white; background: transparent;")
        content_layout.addWidget(message_label)
        
        content_layout.addSpacing(30)
        
        # I Understand button
        understand_btn = QPushButton("I Understand")
        understand_btn.setFixedHeight(50)
        understand_btn.setMinimumWidth(200)
        understand_btn.setStyleSheet("""
            QPushButton {
                background-color: white;
                color: #d97706;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 14px;
                padding: 12px;
            }
            QPushButton:hover {
                background-color: #f3f4f6;
            }
            QPushButton:pressed {
                background-color: #e5e7eb;
            }
        """)
        understand_btn.clicked.connect(self.accept)
        button_layout = QVBoxLayout()
        button_layout.addWidget(understand_btn, alignment=Qt.AlignmentFlag.AlignCenter)
        content_layout.addLayout(button_layout)
        
        # Add content widget to main layout with centering
        layout.addStretch()
        
        # Create a horizontal layout to center the content
        h_layout = QVBoxLayout()
        h_layout.addStretch()
        h_layout.addWidget(content_widget, alignment=Qt.AlignmentFlag.AlignCenter)
        h_layout.addStretch()
        
        layout.addLayout(h_layout, stretch=1)
        
        # Set dialog size - increased to fit all content
        self.setFixedSize(800, 520)
        
        # Center on screen
        self.move(self.screen().geometry().center() - self.rect().center())
