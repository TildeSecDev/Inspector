#!/bin/bash
# Setup script for Inspector Twin PyQt6 Edition

set -e

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
    
    if ! command -v clab &> /dev/null; then
        echo "containerlab is not installed."
        echo ""
        echo "Attempting to install containerlab..."
        
        # Try to detect package manager and install containerlab
        if command -v apt-get &> /dev/null; then
            echo "Using apt package manager..."
            echo "Note: This requires sudo privileges"
            sudo apt-get update
            sudo apt-get install -y containerlab
        elif command -v dnf &> /dev/null; then
            echo "Using dnf package manager..."
            echo "Note: This requires sudo privileges"
            sudo dnf install -y containerlab
        elif command -v yum &> /dev/null; then
            echo "Using yum package manager..."
            echo "Note: This requires sudo privileges"
            sudo yum install -y containerlab
        elif command -v pacman &> /dev/null; then
            echo "Using pacman package manager..."
            echo "Note: This requires sudo privileges"
            sudo pacman -S containerlab
        else
            echo "⚠ Could not detect a supported package manager."
            echo ""
            echo "Please install containerlab manually:"
            echo "  https://containerlab.dev/install/"
            echo ""
            echo "Or use Docker as an alternative:"
            echo "  Ensure Docker is installed and the script will create a wrapper."
            
            # Check for Docker as fallback
            if command -v docker &> /dev/null; then
                echo ""
                echo "✓ Docker is installed. Creating containerlab wrapper..."
                
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

