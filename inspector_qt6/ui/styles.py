"""
Qt Style Sheets for Inspector Twin
Dark theme matching the original Electron/React application
"""


MAIN_STYLESHEET = """
QWidget {
    background: #181818;
    color: #f8f8f8;
    font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
    font-size: 15px;
}

QFrame, QGroupBox, QDialog {
    background-color: qlineargradient(
        x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #303030,
        stop: 1 #282828
    );
    border-radius: 12px;
    border: 1px solid #383838;
}

QPushButton {
    background-color: qlineargradient(
        x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #0068d0,
        stop: 1 #0060c8
    );
    color: #fff;
    border-radius: 12px;
    padding: 8px 20px;
    border: none;
    font-weight: 600;
}
QPushButton:hover {
    background-color: qlineargradient(
        x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #0070d8,
        stop: 1 #0068d0
    );
}
QPushButton:pressed {
    background-color: #0058b8;
}

QLineEdit, QTextEdit {
    background: #202020;
    border-radius: 8px;
    border: 1px solid #383838;
    color: #f8f8f8;
    padding: 6px 12px;
}

QMenuBar, QMenu {
    background: #202020;
    color: #f8f8f8;
    border-radius: 10px;
}

QScrollBar::handle:horizontal {
    background-color: #383838;
    border-radius: 6px;
    min-width: 20px;
}

QScrollBar::handle:horizontal:hover {
    background-color: #505050;
}

/* Menu Bar */
QMenuBar {
    background-color: #181818;
    color: #f8f8f8;
    border-bottom: 1px solid #303030;
    padding: 5px;
}

QMenuBar::item {
    background-color: transparent;
    padding: 5px 10px;
    border-radius: 4px;
}

QMenuBar::item:selected {
    background-color: #183850;
}

QMenu {
    background-color: #282828;
    color: #f8f8f8;
    border: 1px solid #383838;
    border-radius: 4px;
    padding: 5px;
}

QMenu::item {
    padding: 8px 30px 8px 20px;
    border-radius: 4px;
}

QMenu::item:selected {
    background-color: #0060c8;
}

/* Status Bar */
QStatusBar {
    background-color: #181818;
    color: #b0b0b0;
    border-top: 1px solid #303030;
}

/* Buttons */
QPushButton {
    background-color: #0060c8;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 14px;
}

QPushButton:hover {
    background-color: #0068d0;
}

QPushButton:pressed {
    background-color: #0058b8;
}

QPushButton:disabled {
    background-color: #303030;
    color: #909090;
}

/* Input Fields */
QLineEdit, QTextEdit, QPlainTextEdit {
    background-color: #282828;
    color: #f8f8f8;
    border: 1px solid #383838;
    border-radius: 5px;
    padding: 8px 12px;
    selection-background-color: #0060c8;
}

QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
    border: 1px solid #0060c8;
}

QLineEdit::placeholder, QTextEdit::placeholder, QPlainTextEdit::placeholder {
    color: #7f8c8d;
}

/* Tables */
QTableWidget {
    background-color: #282828;
    alternate-background-color: #202020;
    gridline-color: #383838;
    border: 1px solid #383838;
    border-radius: 5px;
}

QTableWidget::item {
    padding: 8px;
    color: #f8f8f8;
}

QTableWidget::item:selected {
    background-color: #0060c8;
}

QHeaderView::section {
    background-color: #181818;
    color: #f8f8f8;
    padding: 10px;
    border: none;
    border-bottom: 2px solid #0060c8;
    font-weight: bold;
}

/* Tabs */
QTabWidget::pane {
    border: none;
    background-color: #181818;
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
    border-bottom: 3px solid #0060c8;
    background-color: #183850;
}

QTabBar::tab:hover:!selected {
    color: #f8f8f8;
    background-color: #303030;
}

/* Dialog */
QDialog {
    background-color: #282828;
    border: 1px solid #383838;
    border-radius: 8px;
}

/* Labels */
QLabel {
    color: #f8f8f8;
    background-color: transparent;
}

/* Combo Box */
QComboBox {
    background-color: #282828;
    color: #f8f8f8;
    border: 1px solid #383838;
    border-radius: 5px;
    padding: 8px 12px;
}

QComboBox:hover {
    border: 1px solid #0060c8;
}

QComboBox::drop-down {
    border: none;
    width: 20px;
}

QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #f8f8f8;
    margin-right: 5px;
}

QComboBox QAbstractItemView {
    background-color: #282828;
    color: #f8f8f8;
    selection-background-color: #0060c8;
    border: 1px solid #383838;
    border-radius: 5px;
}

/* Progress Bar */
QProgressBar {
    background-color: #282828;
    border: 1px solid #383838;
    border-radius: 5px;
    text-align: center;
    color: white;
    height: 25px;
}

QProgressBar::chunk {
    background-color: #0060c8;
    border-radius: 4px;
}

/* Checkboxes and Radio Buttons */
QCheckBox, QRadioButton {
    color: #f8f8f8;
    spacing: 8px;
}

QCheckBox::indicator, QRadioButton::indicator {
    width: 18px;
    height: 18px;
    border: 2px solid #383838;
    border-radius: 3px;
    background-color: #282828;
}

QCheckBox::indicator:checked, QRadioButton::indicator:checked {
    background-color: #0060c8;
    border-color: #0060c8;
}

QCheckBox::indicator:hover, QRadioButton::indicator:hover {
    border-color: #0060c8;
}

/* Spin Box */
QSpinBox, QDoubleSpinBox {
    background-color: #282828;
    color: #f8f8f8;
    border: 1px solid #383838;
    border-radius: 5px;
    padding: 5px;
}

QSpinBox::up-button, QDoubleSpinBox::up-button {
    background-color: #303030;
    border-radius: 3px;
}

QSpinBox::down-button, QDoubleSpinBox::down-button {
    background-color: #303030;
    border-radius: 3px;
}

/* List Widget */
QListWidget {
    background-color: #282828;
    border: 1px solid #383838;
    border-radius: 5px;
    color: #f8f8f8;
}

QListWidget::item {
    padding: 10px;
    border-radius: 4px;
}

QListWidget::item:selected {
    background-color: #0060c8;
}

QListWidget::item:hover:!selected {
    background-color: #183850;
}

/* Tree Widget */
QTreeWidget {
    background-color: #282828;
    border: 1px solid #383838;
    border-radius: 5px;
    color: #f8f8f8;
}

QTreeWidget::item {
    padding: 5px;
}

QTreeWidget::item:selected {
    background-color: #0060c8;
}

QTreeWidget::item:hover:!selected {
    background-color: #183850;
}

/* Tooltips */
QToolTip {
    background-color: #282828;
    color: #f8f8f8;
    border: 1px solid #383838;
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
background-color: #181818;
border-right: 1px solid #303030;
"""

SIDEBAR_HEADER_STYLESHEET = """
background-color: #202020;
border-bottom: 1px solid #303030;
"""

SIDEBAR_TITLE_STYLESHEET = """
padding: 18px 15px;
font-size: 18px;
font-weight: bold;
color: #f8f8f8;
background-color: transparent;
"""

SIDEBAR_MENU_BUTTON_STYLESHEET = """
QPushButton {
    background-color: transparent;
    color: #f8f8f8;
    border: none;
    font-size: 16px;
    padding: 6px 8px;
    border-radius: 4px;
}
QPushButton:hover {
    background-color: #303030;
}
QPushButton:pressed {
    background-color: #383838;
}
"""

SIDEBAR_BUTTON_STYLESHEET = """
QPushButton {
    text-align: left;
    padding: 15px 20px;
    border: none;
    background: transparent;
    color: #c0c0c0;
    font-size: 14px;
    border-left: 3px solid transparent;
}
QPushButton:hover {
    background: #303030;
    color: #f8f8f8;
}
QPushButton:checked {
    background: #183850;
    border-left: 3px solid #0060c8;
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
    background-color: #282828;
    border: 1px solid #383838;
    border-radius: 8px;
    padding: 0;
}
QFrame:hover {
    background-color: #303030;
    border: 1px solid #0060c8;
}
QLabel {
    background: transparent;
}
"""

DIALOG_STYLESHEET = """
QDialog {
    background-color: #282828;
}
QLabel {
    color: white;
    font-size: 14px;
    background: transparent;
}
QLineEdit, QTextEdit {
    background-color: #202020;
    color: white;
    border: 1px solid #383838;
    border-radius: 5px;
    padding: 10px;
}
QLineEdit:focus, QTextEdit:focus {
    border: 1px solid #0060c8;
}
QPushButton {
    background-color: #0060c8;
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 14px;
}
QPushButton:hover {
    background-color: #0068d0;
}
QPushButton:pressed {
    background-color: #0058b8;
}
"""

PROJECT_HEADER_STYLESHEET = """
background-color: #202020;
border-bottom: 1px solid #303030;
padding: 0;
"""

def apply_dark_theme(app):
    """Apply dark theme to the entire application"""
    app.setStyleSheet(MAIN_STYLESHEET)
