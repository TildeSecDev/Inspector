# Inspector Twin - PyQt6 Edition

**Digital Twin Simulation and Security Assessment Platform**

This is the PyQt6 desktop application version of Inspector Twin. This version is built entirely with Python and PyQt6, eliminating the need for Rust, npm, or web technologies.

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- pip package manager
- sudo privileges (required for setup script)

### Installation

1. **Clone the repository and checkout the QT6 branch:**
   ```bash
   git clone <repository-url>
   cd Inspector
   git checkout QT6
   ```

2. **Run the setup script (requires sudo):**
   ```bash
   sudo ./setup_qt6.sh
   ```
   
   The setup script will:
   - Create a Python virtual environment
   - Install all required dependencies
   - Install containerlab (Linux) or set up Docker wrapper (macOS/Linux with Docker)
   - Launch the application

   **Or** install manually:

   ```bash
   pip install -r requirements.txt
   ```

   Or using the project in editable mode:
   ```bash
   pip install -e .
   ```

3. **Run the application:**
   ```bash
   python -m inspector_qt6
   ```

## 📦 Features

- **Visual Topology Editor**: Drag-and-drop interface for building network topologies
- **Device Templates**: Pre-configured device templates (routers, switches, servers, etc.)
- **Property Editor**: Edit node properties, configurations, and commands
- **Export Capabilities**: Export topologies as JSON or containerlab YAML
- **Validation**: Real-time topology validation
- **Zoom & Pan**: Navigate large topologies easily
- **Save/Load**: Save and load topology projects

## 🏗️ Architecture

```
inspector_qt6/
├── __init__.py          # Package initialization
├── __main__.py          # Application entry point
├── ui/                  # User interface components
│   ├── main_window.py   # Main application window
│   └── __init__.py
├── widgets/             # Custom PyQt6 widgets
│   ├── topology_canvas.py    # Topology visual editor
│   ├── device_palette.py     # Device template palette
│   ├── properties_panel.py   # Node properties editor
│   └── __init__.py
├── models/              # Data models
│   ├── topology.py      # Topology data structures
│   └── __init__.py
├── core/                # Core business logic
│   ├── topology_utils.py     # Topology utilities
│   └── __init__.py
└── utils/               # Utility functions
    └── __init__.py
```

## 🎨 Technology Stack

- **Framework**: PyQt6
- **Data Validation**: Pydantic
- **Network Scanning**: Scapy, python-nmap
- **Visualization**: NetworkX, Matplotlib
- **Data Formats**: JSON, YAML (PyYAML)
- **Reports**: ReportLab
- **Database**: SQLAlchemy

## 📝 Usage

### Creating a Topology

1. Launch the application
2. Drag devices from the Device Palette onto the canvas
3. Double-click devices to add them directly
4. Select devices to edit their properties in the Properties Panel
5. Connect devices by creating links

### Saving and Exporting

- **Save**: File → Save (Ctrl+S) - Save as JSON
- **Export YAML**: File → Export as YAML - Export for containerlab

### Validating Topologies

- Edit → Validate Topology (Ctrl+V) - Check for errors

## 🔧 Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black inspector_qt6/
```

### Type Checking

```bash
mypy inspector_qt6/
```

## 📄 License

MIT License - Copyright © 2026 TildeSec

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues, questions, or contributions, please open an issue on the project repository.

---

**Note**: This is the PyQt6 desktop application version. For the web-based version with Tauri/Rust, checkout the `main` branch.
