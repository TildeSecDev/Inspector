#!/bin/bash
# Setup script for Inspector Twin PyQt6 Edition

set -e

# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run with sudo"
    echo "Usage: sudo ./setup_qt6.sh"
    exit 1
fi

echo "==================================="
echo "Inspector Twin - PyQt6 Edition"
echo "Setup Script"
echo "==================================="
echo ""

# Detect OS
OS=$(uname -s)
echo "Detected OS: $OS"
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

# Check for containerlab and install Docker wrapper if needed
echo ""
echo "Checking for containerlab..."

if [ "$OS" = "Darwin" ]; then
    # macOS setup
    echo "Setting up for macOS..."
    echo ""
    
    if ! command -v clab &> /dev/null; then
        echo "containerlab is not installed."
        echo ""
        
        # Check for Docker
        echo "Checking for Docker..."
        if ! command -v docker &> /dev/null; then
            echo "⚠ Docker is not installed or not in PATH."
            echo ""
            echo "For macOS, the recommended approach is to use containerlab via Docker."
            echo "Please install Docker Desktop first: https://www.docker.com/products/docker-desktop"
        else
            echo "✓ Docker is installed"
            echo "✓ Installing containerlab wrapper script..."
            echo ""
            
            # Create wrapper script in venv bin directory
            cat > venv/bin/clab << 'EOF'
#!/bin/bash
# Wrapper script for containerlab using Docker container
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

docker run --rm --privileged \
    --network host \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /var/run/netns:/var/run/netns \
    -v /etc/hosts:/etc/hosts \
    -v /var/lib/docker/containers:/var/lib/docker/containers \
    --pid="host" \
    -v "$(pwd):$(pwd)" \
    -w "$(pwd)" \
    ghcr.io/srl-labs/clab "$@"
EOF
            
            chmod +x venv/bin/clab
            
            if command -v clab &> /dev/null; then
                echo "✓ containerlab wrapper installed successfully"
            else
                echo "⚠ Failed to install wrapper. Docker containerlab may not work."
            fi
        fi
    else
        echo "✓ containerlab is already installed"
    fi

elif [ "$OS" = "Linux" ]; then
    # Linux setup
    echo "Setting up for Linux..."
    echo ""
    
    # Install Qt6 and system dependencies
    echo "Installing Qt6 and system dependencies..."
    if command -v apt-get &> /dev/null; then
        sudo -E apt-get update
        sudo -E apt-get install -y \
            qt6-base-dev \
            qt6-tools-dev \
            qt6-tools-dev-tools \
            libqt6core6 \
            libqt6gui6 \
            libqt6widgets6 \
            libgl1-mesa-dev \
            libglu1-mesa-dev \
            build-essential \
            python3-dev
        echo "✓ Qt6 dependencies installed"
    elif command -v dnf &> /dev/null; then
        sudo -E dnf install -y \
            qt6-qtbase-devel \
            qt6-qttools-devel \
            mesa-libGL-devel \
            mesa-libGLU-devel \
            gcc-c++ \
            python3-devel
        echo "✓ Qt6 dependencies installed"
    elif command -v yum &> /dev/null; then
        sudo -E yum install -y \
            qt6-qtbase-devel \
            qt6-qttools-devel \
            mesa-libGL-devel \
            mesa-libGLU-devel \
            gcc-c++ \
            python3-devel
        echo "✓ Qt6 dependencies installed"
    elif command -v pacman &> /dev/null; then
        sudo -E pacman -S --noconfirm \
            qt6-base \
            qt6-tools \
            mesa \
            gcc \
            python
        echo "✓ Qt6 dependencies installed"
    else
        echo "⚠ Could not detect package manager for Qt6 installation"
        echo "Please install Qt6 development packages manually"
    fi
    echo ""
    
    if ! command -v clab &> /dev/null; then
        echo "containerlab is not installed."
        echo ""
        echo "Installing containerlab using official installation script..."
        
        # Use the official containerlab installation script
        bash -c "$(curl -sL https://get.containerlab.dev)"
        
        # Check if installation was successful
        if command -v clab &> /dev/null; then
            echo "✓ containerlab installed successfully"
        else
            echo "⚠ containerlab installation failed"
            echo ""
            
            # Check for Docker as fallback
            if command -v docker &> /dev/null; then
                echo "✓ Docker is installed. Creating containerlab wrapper as fallback..."
                
                cat > venv/bin/clab << 'EOF'
#!/bin/bash
# Wrapper script for containerlab using Docker container
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

docker run --rm --privileged \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /run/netns:/run/netns \
    -v /etc/hosts:/etc/hosts \
    --net host \
    -v "$(pwd):$(pwd)" \
    -w "$(pwd)" \
    ghcr.io/srl-labs/clab "$@"
EOF
                
                chmod +x venv/bin/clab
                echo "✓ Docker wrapper created"
            else
                echo "⚠ Neither containerlab nor Docker is available."
                echo "Please install Docker or containerlab manually:"
                echo "  https://containerlab.dev/install/"
            fi
        fi
    else
        echo "✓ containerlab is already installed"
    fi

else
    # Other OS
    echo "⚠ Unsupported OS: $OS"
    echo ""
    echo "This setup script supports macOS (Darwin) and Linux."
    echo "Please install containerlab manually: https://containerlab.dev/install/"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."

if [ "$OS" = "Darwin" ]; then
    # macOS - use requirements-macos.txt which includes PyQt6-Qt6 binaries
    echo "Using macOS requirements file..."
    pip install -r requirements-macos.txt
elif [ "$OS" = "Linux" ]; then
    # Linux - use requirements-linux.txt and system Qt6
    echo "Using Linux requirements file..."
    
    # Ensure qmake6 is in PATH for PyQt6 compilation
    export PATH="/usr/lib/qt6/bin:$PATH"
    
    # Install PyQt6 using system Qt6 libraries
    pip install -r requirements-linux.txt
else
    # Fallback to generic requirements.txt
    echo "Using generic requirements file..."
    pip install -r requirements.txt
fi

# Install in development mode
echo ""
echo "Installing Inspector Twin in development mode..."
pip install -e .

# Fix venv ownership if running as sudo
if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
    echo ""
    echo "Fixing virtual environment ownership..."
    chown -R "$SUDO_USER:$SUDO_USER" venv
fi

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "To run Inspector Twin:"
echo ""
if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
    echo "  1. Exit sudo environment:"
    echo "     exit"
    echo ""
    echo "  2. Activate the virtual environment:"
    echo "     source venv/bin/activate"
    echo ""
    echo "  3. Run the application:"
    echo "     python -m inspector_qt6"
    echo ""
    echo "Or run directly without activating venv:"
    echo "  ./venv/bin/python -m inspector_qt6"
else
    echo "  source venv/bin/activate"
    echo "  python -m inspector_qt6"
fi
echo ""

