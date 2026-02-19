# Inspector Twin QT6 - Quick Start Guide

## 🎯 You Are Here
**Branch**: `QT6`  
**Technology**: Pure Python + PyQt6 (no Rust, no npm)

## 🚀 Run the Application (3 Ways)

### Method 1: Direct Run (Recommended)
```bash
python -m inspector_qt6
```

### Method 2: After Installation
```bash
pip install -e .
inspector-twin
```

### Method 3: Using Setup Script
```bash
./setup_qt6.sh      # First time setup
python -m inspector_qt6
```

## 📦 Setup (First Time)

```bash
# 1. Make sure you're on QT6 branch
git branch  # Should show QT6

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python -m inspector_qt6
```

## ✅ Verify Everything Works

```bash
./verify_qt6.sh
```

This checks:
- Python version (needs 3.10+)
- PyQt6 installation
- All dependencies
- Module imports
- Runs test suite

## 🧪 Run Tests

```bash
pytest test_inspector_qt6.py -v
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [README_QT6.md](README_QT6.md) | Full user documentation |
| [BRANCH_COMPARISON.md](BRANCH_COMPARISON.md) | Main vs QT6 comparison |
| [QT6_IMPLEMENTATION_SUMMARY.md](QT6_IMPLEMENTATION_SUMMARY.md) | Technical implementation details |
| This file | Quick reference |

## 🏗️ Project Structure

```
inspector_qt6/
├── __main__.py                    # Entry point
├── ui/
│   └── main_window.py             # Main application window
├── widgets/
│   ├── topology_canvas.py         # Visual editor
│   ├── device_palette.py          # Device templates
│   └── properties_panel.py        # Property editor
├── pages/
│   ├── projects_page.py           # Projects management
│   ├── settings_page.py           # Application settings
│   └── reports_page.py            # Report generation
├── models/
│   └── topology.py                # Data models
├── core/
│   └── topology_utils.py          # Utilities
├── frontend/                      # Original frontend assets
└── containerlab_examples/         # Containerlab examples

Additional:
├── OTLP/                          # OpenTelemetry collector
├── scripts/                       # Utility scripts  
├── setup_qt6.sh                   # Setup (Unix)
├── setup_qt6.bat                  # Setup (Windows)
└── verify_qt6.sh                  # Verification
```

## 💡 Features

- **Visual Editor**: Drag & drop devices onto canvas
- **Device Templates**: Router, Switch, Host, Server, Firewall
- **Properties Panel**: Edit device configurations
- **Export**: Save as JSON or YAML (containerlab)
- **Validation**: Check topology for errors
- **Zoom**: Navigate large topologies

## 🔧 Common Commands

```bash
# Run application
python -m inspector_qt6

# Run tests
pytest test_inspector_qt6.py

# Verify setup
./verify_qt6.sh

# Format code
black inspector_qt6/

# Type check
mypy inspector_qt6/

# Switch to main branch
git checkout main
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'PyQt6'"
```bash
pip install -r requirements.txt
```

### "command not found: python"
Try `python3` instead:
```bash
python3 -m inspector_qt6
```

### "Permission denied: ./setup_qt6.sh"
```bash
chmod +x setup_qt6.sh
./setup_qt6.sh
```

### Application won't start
Run verification:
```bash
./verify_qt6.sh
```

## 🔄 Switch Between Branches

### To Main (Rust/Tauri version)
```bash
git checkout main
npm install && cargo build
npm run tauri dev
```

### To QT6 (Python version)
```bash
git checkout QT6
pip install -r requirements.txt
python -m inspector_qt6
```

## 📊 What's Different from Main?

| Aspect | Main Branch | QT6 Branch |
|--------|-------------|------------|
| Language | TypeScript + Rust | Pure Python |
| GUI | Web (HTML/CSS/JS) | PyQt6 (Native) |
| Build | npm + cargo | pip |
| Size | ~200 MB | ~50-100 MB |
| Startup | Slower (webview) | Fast (native) |
| Dependencies | Node.js + Rust | Python only |

## 🎓 Learning Resources

- **PyQt6 Docs**: https://doc.qt.io/qtforpython/
- **Pydantic**: https://docs.pydantic.dev/
- **Containerlab**: https://containerlab.dev/

## 🤝 Need Help?

1. Read [README_QT6.md](README_QT6.md) for detailed usage
2. Check [BRANCH_COMPARISON.md](BRANCH_COMPARISON.md) for differences
3. Run `./verify_qt6.sh` to check your setup
4. Open an issue on GitHub

---

**Quick Start**: `python -m inspector_qt6` ← Just run this! 🚀
