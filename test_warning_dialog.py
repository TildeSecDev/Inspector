#!/usr/bin/env python3
"""
Test script to verify the authorization warning dialog appears on startup
Run with: python test_warning_dialog.py
"""
import sys
from PyQt6.QtWidgets import QApplication
from inspector_qt6.ui.warning_dialog import AuthorizationWarningDialog

def test_warning_dialog():
    """Test the warning dialog in isolation"""
    app = QApplication(sys.argv)
    
    # Create and show the dialog
    dialog = AuthorizationWarningDialog()
    result = dialog.exec()
    
    if result == 1:  # QDialog.Accepted
        print("✓ Warning dialog was accepted by user")
        sys.exit(0)
    else:
        print("✗ Warning dialog was rejected")
        sys.exit(1)

if __name__ == "__main__":
    test_warning_dialog()
