"""
Main entry point for Inspector Twin PyQt6 Application
"""
import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt
from inspector_qt6.ui.main_window import MainWindow
from inspector_qt6.ui.styles import apply_dark_theme


def main():
    """Initialize and run the Inspector Twin application"""
    # Enable high DPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    
    app = QApplication(sys.argv)
    app.setApplicationName("Inspector Twin")
    app.setApplicationVersion("0.1.0")
    app.setOrganizationName("TildeSec")
    
    # Apply dark theme
    apply_dark_theme(app)
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
