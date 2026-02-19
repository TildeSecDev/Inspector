"""
Qt Style Sheets for Inspector Twin
Dark theme matching the original Electron/React application
"""

MAIN_STYLESHEET = """
/* Global Application Styles */
QMainWindow, QWidget {
    background-color: #1a1a1a;
    color: #ecf0f1;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
}

/* Scrollbars */
QScrollBar:vertical {
    background-color: #1a1a1a;
    width: 12px;
    margin: 0;
}

QScrollBar::handle:vertical {
    background-color: #444;
    border-radius: 6px;
    min-height: 20px;
}

QScrollBar::handle:vertical:hover {
    background-color: #555;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    background-color: #1a1a1a;
    height: 12px;
}

QScrollBar::handle:horizontal {
    background-color: #444;
    border-radius: 6px;
    min-width: 20px;
}

QScrollBar::handle:horizontal:hover {
    background-color: #555;
}

/* Menu Bar */
QMenuBar {
    background-color: #1a1a1a;
    color: #ecf0f1;
    border-bottom: 1px solid #2c2c2c;
    padding: 5px;
}

QMenuBar::item {
    background-color: transparent;
    padding: 5px 10px;
    border-radius: 4px;
}

QMenuBar::item:selected {
    background-color: #2c3e50;
}

QMenu {
    background-color: #2c2c2c;
    color: #ecf0f1;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px;
}

QMenu::item {
    padding: 8px 30px 8px 20px;
    border-radius: 4px;
}

QMenu::item:selected {
    background-color: #3498db;
}

/* Status Bar */
QStatusBar {
    background-color: #1a1a1a;
    color: #7f8c8d;
    border-top: 1px solid #2c2c2c;
}

/* Buttons */
QPushButton {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 14px;
}

QPushButton:hover {
    background-color: #2980b9;
}

QPushButton:pressed {
    background-color: #21618c;
}

QPushButton:disabled {
    background-color: #34495e;
    color: #7f8c8d;
}

/* Input Fields */
QLineEdit, QTextEdit, QPlainTextEdit {
    background-color: #2c2c2c;
    color: #ecf0f1;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 8px 12px;
    selection-background-color: #3498db;
}

QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
    border: 1px solid #3498db;
}

QLineEdit::placeholder, QTextEdit::placeholder, QPlainTextEdit::placeholder {
    color: #7f8c8d;
}

/* Tables */
QTableWidget {
    background-color: #2c2c2c;
    alternate-background-color: #262626;
    gridline-color: #444;
    border: 1px solid #444;
    border-radius: 5px;
}

QTableWidget::item {
    padding: 8px;
    color: #ecf0f1;
}

QTableWidget::item:selected {
    background-color: #3498db;
}

QHeaderView::section {
    background-color: #1a1a1a;
    color: #ecf0f1;
    padding: 10px;
    border: none;
    border-bottom: 2px solid #3498db;
    font-weight: bold;
}

/* Tabs */
QTabWidget::pane {
    border: none;
    background-color: #1a1a1a;
}

QTabBar::tab {
    background-color: transparent;
    color: #b0b0b0;
    padding: 14px 30px;
    margin-right: 2px;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 14px;
    font-weight: 500;
}

QTabBar::tab:selected {
    color: white;
    border-bottom: 3px solid #3498db;
    background-color: rgba(52, 152, 219, 0.1);
}

QTabBar::tab:hover:!selected {
    color: #ecf0f1;
    background-color: rgba(255, 255, 255, 0.05);
}

/* Dialog */
QDialog {
    background-color: #2c2c2c;
    border: 1px solid #444;
    border-radius: 8px;
}

/* Labels */
QLabel {
    color: #ecf0f1;
    background-color: transparent;
}

/* Combo Box */
QComboBox {
    background-color: #2c2c2c;
    color: #ecf0f1;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 8px 12px;
}

QComboBox:hover {
    border: 1px solid #3498db;
}

QComboBox::drop-down {
    border: none;
    width: 20px;
}

QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #ecf0f1;
    margin-right: 5px;
}

QComboBox QAbstractItemView {
    background-color: #2c2c2c;
    color: #ecf0f1;
    selection-background-color: #3498db;
    border: 1px solid #444;
    border-radius: 5px;
}

/* Progress Bar */
QProgressBar {
    background-color: #2c2c2c;
    border: 1px solid #444;
    border-radius: 5px;
    text-align: center;
    color: white;
    height: 25px;
}

QProgressBar::chunk {
    background-color: #3498db;
    border-radius: 4px;
}

/* Checkboxes and Radio Buttons */
QCheckBox, QRadioButton {
    color: #ecf0f1;
    spacing: 8px;
}

QCheckBox::indicator, QRadioButton::indicator {
    width: 18px;
    height: 18px;
    border: 2px solid #444;
    border-radius: 3px;
    background-color: #2c2c2c;
}

QCheckBox::indicator:checked, QRadioButton::indicator:checked {
    background-color: #3498db;
    border-color: #3498db;
}

QCheckBox::indicator:hover, QRadioButton::indicator:hover {
    border-color: #3498db;
}

/* Spin Box */
QSpinBox, QDoubleSpinBox {
    background-color: #2c2c2c;
    color: #ecf0f1;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 5px;
}

QSpinBox::up-button, QDoubleSpinBox::up-button {
    background-color: #34495e;
    border-radius: 3px;
}

QSpinBox::down-button, QDoubleSpinBox::down-button {
    background-color: #34495e;
    border-radius: 3px;
}

/* List Widget */
QListWidget {
    background-color: #2c2c2c;
    border: 1px solid #444;
    border-radius: 5px;
    color: #ecf0f1;
}

QListWidget::item {
    padding: 10px;
    border-radius: 4px;
}

QListWidget::item:selected {
    background-color: #3498db;
}

QListWidget::item:hover:!selected {
    background-color: rgba(52, 152, 219, 0.2);
}

/* Tree Widget */
QTreeWidget {
    background-color: #2c2c2c;
    border: 1px solid #444;
    border-radius: 5px;
    color: #ecf0f1;
}

QTreeWidget::item {
    padding: 5px;
}

QTreeWidget::item:selected {
    background-color: #3498db;
}

QTreeWidget::item:hover:!selected {
    background-color: rgba(52, 152, 219, 0.2);
}

/* Tooltips */
QToolTip {
    background-color: #2c2c2c;
    color: #ecf0f1;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 5px;
}

/* Frame */
QFrame {
    border-radius: 5px;
}

/* Graphics View (for topology canvas) */
QGraphicsView {
    background-color: #0d0d0d;
    border: none;
}
"""

SIDEBAR_STYLESHEET = """
background-color: #2c3e50;
border-right: 1px solid #1a252f;
"""

SIDEBAR_HEADER_STYLESHEET = """
background-color: #1a252f;
border-bottom: 1px solid #17202a;
"""

SIDEBAR_TITLE_STYLESHEET = """
padding: 18px 15px;
font-size: 18px;
font-weight: bold;
color: #ecf0f1;
background-color: transparent;
"""

SIDEBAR_MENU_BUTTON_STYLESHEET = """
QPushButton {
    background-color: transparent;
    color: #ecf0f1;
    border: none;
    font-size: 16px;
    padding: 6px 8px;
    border-radius: 4px;
}
QPushButton:hover {
    background-color: rgba(255, 255, 255, 0.1);
}
QPushButton:pressed {
    background-color: rgba(255, 255, 255, 0.2);
}
"""

SIDEBAR_BUTTON_STYLESHEET = """
QPushButton {
    text-align: left;
    padding: 15px 20px;
    border: none;
    background: transparent;
    color: #b0b0b0;
    font-size: 14px;
    border-left: 3px solid transparent;
}
QPushButton:hover {
    background: rgba(52, 73, 94, 0.5);
    color: #ecf0f1;
}
QPushButton:checked {
    background: rgba(52, 73, 94, 0.8);
    border-left: 3px solid #3498db;
    color: white;
    font-weight: 600;
}
"""

WARNING_BOX_STYLESHEET = """
background-color: #d97706;
padding: 14px;
margin: 10px;
border-radius: 8px;
"""

WARNING_TITLE_STYLESHEET = """
color: #ffffff;
font-weight: bold;
font-size: 13px;
margin-bottom: 6px;
background: transparent;
"""

WARNING_TEXT_STYLESHEET = """
color: #ffffff;
font-size: 12px;
background: transparent;
"""

PROJECT_CARD_STYLESHEET = """
QFrame {
    background-color: #2c2c2c;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    padding: 0;
}
QFrame:hover {
    background-color: #333;
    border: 1px solid #3498db;
}
QLabel {
    background: transparent;
}
"""

DIALOG_STYLESHEET = """
QDialog {
    background-color: #2c2c2c;
}
QLabel {
    color: white;
    font-size: 14px;
    background: transparent;
}
QLineEdit, QTextEdit {
    background-color: #1a1a1a;
    color: white;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 10px;
}
QLineEdit:focus, QTextEdit:focus {
    border: 1px solid #3498db;
}
QPushButton {
    background-color: #3498db;
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 14px;
}
QPushButton:hover {
    background-color: #2980b9;
}
QPushButton:pressed {
    background-color: #21618c;
}
"""

PROJECT_HEADER_STYLESHEET = """
background-color: #1a1a1a;
border-bottom: 1px solid #2c2c2c;
padding: 0;
"""

def apply_dark_theme(app):
    """Apply dark theme to the entire application"""
    app.setStyleSheet(MAIN_STYLESHEET)
