#!/bin/bash
# Setup script for Inspector Twin PyQt6 Edition

set -e

echo "==================================="
echo "Inspector Twin - PyQt6 Edition"
echo "Setup Script"
echo "==================================="
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python $python_version"

# Check if Python 3.10 or higher
required_version="3.10"
if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then 
    echo "Error: Python 3.10 or higher is required"
    exit 1
fi

# Check for containerlab
echo ""
echo "Checking for containerlab..."
if ! command -v clab &> /dev/null; then
    echo "containerlab is not installed. Attempting installation..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - try Homebrew first
        if command -v brew &> /dev/null; then
            echo "Installing containerlab via Homebrew..."
            brew install containerlab
        else
            echo "Homebrew not found. Installing containerlab using official installer..."
            bash -c "$(curl -sL https://get.containerlab.dev)" || true
        fi
    else
        # Linux - use official installer
        echo "Installing containerlab using official installer..."
        bash -c "$(curl -sL https://get.containerlab.dev)" || true
    fi
    
    if command -v clab &> /dev/null; then
        echo "✓ containerlab installed successfully"
    else
        echo "⚠ Warning: containerlab installation failed or skipped."
        echo "  Some features requiring network simulation will not be available."
        echo "  You can manually install containerlab from: https://containerlab.dev/install/"
    fi
else
    echo "✓ containerlab is already installed"
fi

# Create virtual environment
echo ""
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Virtual environment created"
else
    echo "Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

# Install in development mode
echo ""
echo "Installing Inspector Twin in development mode..."
pip install -e .

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "Starting Inspector Twin..."
echo ""
python -m inspector_qt6
