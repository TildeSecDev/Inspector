# QT6 Branch Contents

## Overview
The QT6 branch is a pure PyQt6 implementation with **no Rust, no npm, no web dependencies**.

## Repository Size
- **Total Size**: 656MB
- **Tracked Files**: 2,851 files
- **Primary Components**:
  - OTLP (OpenTelemetry Collector): ~500MB (Go telemetry infrastructure)
  - Inspector Qt6 Application: ~140MB (Python PyQt6 app + assets)
  - Scripts: ~16MB (network scanner, build utilities)

## What Gets Cloned

When someone runs `git clone --branch QT6 <repo-url>`, they will get:

### 1. Main Application: `inspector_qt6/` (~340 files)
- **Core Application**:
  - `__main__.py` - Application entry point
  - `ui/main_window.py` - Main window with menus, toolbars, docking
  - `models/topology.py` - Pydantic data models
  - `core/topology_utils.py` - Topology validation and YAML export

- **Widgets** (Interactive Components):
  - `widgets/topology_canvas.py` - QGraphicsView-based topology editor
  - `widgets/device_palette.py` - Device template selector
  - `widgets/properties_panel.py` - Node property editor

- **Pages** (Main Views):
  - `pages/projects_page.py` - Project management UI
  - `pages/settings_page.py` - Application settings
  - `pages/reports_page.py` - Report generation UI

- **Network Scanner**:
  - `network_scanner/mapper.py` - Network discovery tool (35KB)
  - `network_scanner/scan-network-topology.sh` - Scan automation script
  - `network_scanner/README.md` - Documentation

- **Sample Data**:
  - `network_scans/` - 6 sample scan files (JSON, containerlab YAML, docker-compose)

- **Reference Assets**:
  - `frontend/` - Original TypeScript/React code for reference
  - `containerlab_examples/` - Containerlab configuration examples

### 2. OTLP Directory: `OTLP/` (~2,499 files)
- **OpenTelemetry Collector** (Go-based telemetry infrastructure)
- Used for distributed tracing and observability
- Kept per user request for telemetry integration

### 3. Scripts: `scripts/` (13 files)
- `network-topology-mapper.py` - Standalone network scanner
- `scan-network-topology.sh` - Scanning automation
- `build.sh` - Build utilities
- `seed.mjs` - Database seeding
- `smoke-test.sh` - Integration testing
- Documentation files (INTEGRATION_GUIDE.md, QUICK_REFERENCE.md, etc.)

### 4. Configuration & Setup Files (Root)
- `pyproject.toml` - Python project configuration with PyQt6 dependencies
- `requirements.txt` - Python package requirements
- `setup_qt6.sh` / `setup_qt6.bat` - Setup scripts for Unix/Windows
- `verify_qt6.sh` - Installation verification script
- `test_inspector_qt6.py` - PyQt6 test suite (18+ tests)

### 5. Documentation (Root)
- `README_QT6.md` - Main PyQt6 documentation
- `QUICKSTART_QT6.md` - Quick start guide
- `QT6_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `BRANCH_COMPARISON.md` - Comparison with main branch
- `.playwright-mcp/` - 17 UI screenshots (PNG files)

### 6. Development Files
- `.gitignore` - Git ignore patterns
- `.git/` - Git repository metadata

## What Was Removed (Not in Clone)
These were in the main branch but removed from QT6:

- ❌ `node_modules/` - 538MB npm packages
- ❌ `src-tauri/` - 2.2GB Rust/Tauri code
- ❌ `packages/` - 12MB TypeScript packages
- ❌ `apps/` - 8.5MB old renderer/desktop apps
- ❌ `src/` - Old Python twin code
- ❌ `package.json`, `package-lock.json` - npm configs
- ❌ `tsconfig.json`, `playwright.config.ts` - TypeScript/test configs
- ❌ `demo/`, `docs/`, `tests/` - Old documentation and tests

**Total Removed**: ~2.76GB of web/Rust dependencies

## Technology Stack

### Runtime
- **Python 3.10+** - Core language
- **PyQt6 6.7.0** - Desktop GUI framework
- **Qt 6** - Native widgets and graphics

### Core Libraries
- **Pydantic 2.6.1** - Data validation and models
- **PyYAML 6.0.1** - YAML parsing/generation
- **SQLAlchemy 2.0.25** - Database ORM

### Network Scanning
- **scapy 2.5.0** - Packet manipulation
- **python-nmap 0.7.1** - Nmap integration
- **NetworkX 3.2.1** - Graph operations

### Reporting
- **ReportLab 4.0.9** - PDF generation
- **Matplotlib 3.8.2** - Visualization

### Testing
- **pytest 8.0.0** - Test framework
- **pytest-qt 4.3.1** - PyQt6 testing

## Quick Start

```bash
# Clone the QT6 branch
git clone --branch QT6 git@github.com:TildeSecDev/Inspector.git
cd Inspector

# Run setup (Unix/macOS)
chmod +x setup_qt6.sh
./setup_qt6.sh

# Or setup (Windows)
setup_qt6.bat

# Verify installation
./verify_qt6.sh

# Run application
python -m inspector_qt6

# Or with pip install
pip install -e .
inspector-qt6
```

## Project Structure

```
Inspector/
├── inspector_qt6/          # Main PyQt6 application
│   ├── __main__.py        # Entry point
│   ├── ui/                # Main windows
│   ├── widgets/           # Reusable components
│   ├── pages/             # Application pages
│   ├── models/            # Data models
│   ├── core/              # Core utilities
│   ├── network_scanner/   # Network discovery
│   ├── network_scans/     # Sample scans
│   ├── frontend/          # Reference assets
│   └── containerlab_examples/  # Lab configs
├── OTLP/                  # Telemetry infrastructure
├── scripts/               # Build and utility scripts
├── pyproject.toml         # Python config
├── requirements.txt       # Dependencies
└── README_QT6.md          # Documentation
```

## Features

### Implemented
✅ Interactive topology editor with drag-and-drop  
✅ Device palette with pre-configured templates  
✅ Properties panel for node editing  
✅ Project management (create, open, delete)  
✅ Settings configuration (General, Network, Docker)  
✅ Report generation (JSON, PDF, YAML)  
✅ Topology validation and export  
✅ Containerlab YAML generation  
✅ Network scanning and discovery  

### In Progress
🔨 Database integration for project persistence  
🔨 Network scanner UI integration  
🔨 PDF report styling and formatting  

## Testing

```bash
# Run all tests
pytest test_inspector_qt6.py -v

# Run specific test category
pytest test_inspector_qt6.py::test_topology_canvas -v
pytest test_inspector_qt6.py::test_main_window -v
pytest test_inspector_qt6.py::test_topology_utils -v
```

## Branch Info

- **Branch Name**: QT6
- **Based On**: main branch (diverged)
- **Commits**: 6 commits ahead of origin/QT6
- **Last Major Change**: Cleanup and consolidation (removed 2.76GB)

## Maintenance Notes

- All PyQt6 code is in `inspector_qt6/` folder
- Original frontend assets preserved in `inspector_qt6/frontend/` for reference
- Network scanner tools integrated from `scripts/`
- OTLP directory kept for telemetry (user request)
- No web or Rust dependencies remain
- Working directory is clean (no untracked build artifacts)
