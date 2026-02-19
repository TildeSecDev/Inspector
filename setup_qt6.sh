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
    echo "containerlab is not installed."
    echo ""
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS specific - recommend Docker container approach
        echo "For macOS, the recommended approach is to use containerlab via Docker."
        echo ""
        echo "Prerequisites:"
        echo "- Docker Desktop must be installed: https://www.docker.com/products/docker-desktop"
        echo ""
        echo "Then, containerlab is available as a Docker image and can be used with:"
        echo "  docker run --rm -it --privileged \\"
        echo "    --network host \\"
        echo "    -v /var/run/docker.sock:/var/run/docker.sock \\"
        echo "    -v /var/run/netns:/var/run/netns \\"
        echo "    -v /etc/hosts:/etc/hosts \\"
        echo "    -v /var/lib/docker/containers:/var/lib/docker/containers \\"
        echo "    --pid=\"host\" \\"
        echo "    -v \$(pwd):\$(pwd) \\"
        echo "    -w \$(pwd) \\"
        echo "    ghcr.io/srl-labs/clab bash"
        echo ""
        echo "For more details, see: https://containerlab.dev/macos/"
        echo ""
        echo "⚠ Skipping containerlab installation - use Docker container when needed"
    else
        # Linux - try automated installation
        echo "Attempting automated installation on Linux..."
        bash -c "$(curl -sL https://get.containerlab.dev)" || true
        
        if command -v clab &> /dev/null; then
            echo "✓ containerlab installed successfully"
        else
            echo "⚠ containerlab installation failed."
            echo "For manual installation, visit: https://containerlab.dev/install/"
        fi
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
