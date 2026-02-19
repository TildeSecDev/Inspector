#!/bin/bash
# Verification script for Inspector Twin PyQt6 Edition

set -e

echo "========================================"
echo "Inspector Twin QT6 - Verification"
echo "========================================"
echo ""

# Check Python
echo "✓ Checking Python..."
python3_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "  Python version: $python3_version"

# Check pip
echo ""
echo "✓ Checking pip..."
pip_version=$(pip --version 2>&1 | awk '{print $2}')
echo "  pip version: $pip_version"

# Check PyQt6
echo ""
echo "✓ Checking PyQt6..."
if python3 -c "import PyQt6" 2>/dev/null; then
    pyqt_version=$(python3 -c "from PyQt6.QtCore import PYQT_VERSION_STR; print(PYQT_VERSION_STR)")
    echo "  PyQt6 version: $pyqt_version"
else
    echo "  ✗ PyQt6 not installed"
    echo "  Run: pip install -r requirements.txt"
    exit 1
fi

# Check other dependencies
echo ""
echo "✓ Checking dependencies..."
dependencies=("pydantic" "yaml" "reportlab" "networkx")
for dep in "${dependencies[@]}"; do
    if python3 -c "import $dep" 2>/dev/null; then
        echo "  ✓ $dep"
    else
        echo "  ✗ $dep not found"
    fi
done

# Check module imports
echo ""
echo "✓ Checking Inspector Twin modules..."
if python3 -c "from inspector_qt6.models.topology import Topology" 2>/dev/null; then
    echo "  ✓ Models module"
else
    echo "  ✗ Models module failed to import"
    exit 1
fi

if python3 -c "from inspector_qt6.core.topology_utils import topology_to_yaml" 2>/dev/null; then
    echo "  ✓ Core module"
else
    echo "  ✗ Core module failed to import"
    exit 1
fi

if python3 -c "from inspector_qt6.ui.main_window import MainWindow" 2>/dev/null; then
    echo "  ✓ UI module"
else
    echo "  ✗ UI module failed to import"
    exit 1
fi

# Run tests if pytest is available
echo ""
echo "✓ Running tests..."
if command -v pytest &> /dev/null; then
    pytest test_inspector_qt6.py -v --tb=short
    echo "  ✓ Tests passed"
else
    echo "  ⚠ pytest not installed, skipping tests"
fi

echo ""
echo "========================================"
echo "✓ Verification Complete!"
echo "========================================"
echo ""
echo "To run the application:"
echo "  python -m inspector_qt6"
echo ""
