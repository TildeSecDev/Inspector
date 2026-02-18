#!/bin/bash
# Test script to verify network scanner setup
# This runs basic validation without requiring root or network access

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Inspector Twin - Network Scanner Installation Verification  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

EXIT_CODE=0

# Test 1: Check script files exist and are executable
echo "📁 Test 1: Checking script files..."
if [ -x "scripts/network-topology-mapper.py" ]; then
    echo "  ✅ network-topology-mapper.py exists and is executable"
else
    echo "  ❌ network-topology-mapper.py not found or not executable"
    EXIT_CODE=1
fi

if [ -x "scripts/scan-network-topology.sh" ]; then
    echo "  ✅ scan-network-topology.sh exists and is executable"
else
    echo "  ❌ scan-network-topology.sh not found or not executable"
    EXIT_CODE=1
fi

echo ""

# Test 2: Check documentation files exist
echo "📖 Test 2: Checking documentation files..."
DOCS=(
    "scripts/NETWORK_SCANNER_README.md"
    "scripts/INTEGRATION_GUIDE.md"
    "scripts/QUICK_REFERENCE.md"
    "scripts/example-network-topology.json"
    "scripts/otlp-collector-config.yaml"
    "scripts/requirements-network-scanner.txt"
    "NETWORK_SCANNER_FEATURE.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        SIZE=$(wc -c < "$doc" | tr -d ' ')
        # requirements.txt can be small, others should have content
        MIN_SIZE=100
        if [[ "$doc" == *"requirements"* ]]; then
            MIN_SIZE=10
        fi
        
        if [ "$SIZE" -gt "$MIN_SIZE" ]; then
            echo "  ✅ $doc ($SIZE bytes)"
        else
            echo "  ⚠️  $doc exists but seems too small ($SIZE bytes)"
            EXIT_CODE=1
        fi
    else
        echo "  ❌ $doc not found"
        EXIT_CODE=1
    fi
done

echo ""

# Test 3: Validate Python syntax
echo "🐍 Test 3: Validating Python syntax..."
if command -v python3 &> /dev/null; then
    if python3 -m py_compile scripts/network-topology-mapper.py 2>/dev/null; then
        echo "  ✅ Python script syntax is valid"
    else
        echo "  ❌ Python syntax errors found"
        EXIT_CODE=1
    fi
else
    echo "  ⚠️  Python3 not found - skipping syntax check"
fi

echo ""

# Test 4: Validate bash syntax
echo "📜 Test 4: Validating bash syntax..."
if bash -n scripts/scan-network-topology.sh 2>/dev/null; then
    echo "  ✅ Bash script syntax is valid"
else
    echo "  ❌ Bash syntax errors found"
    EXIT_CODE=1
fi

echo ""

# Test 5: Check for Python dependencies
echo "📦 Test 5: Checking Python dependencies..."
if command -v python3 &> /dev/null; then
    # Check required dependencies
    python3 -c "import sys" 2>/dev/null && echo "  ✅ Python standard library available"
    
    # Check optional dependencies
    if python3 -c "import scapy" 2>/dev/null; then
        echo "  ✅ scapy installed"
    else
        echo "  ⚠️  scapy not installed (optional, improves ARP scanning)"
        echo "     Install: pip3 install scapy"
    fi
    
    if python3 -c "import yaml" 2>/dev/null; then
        echo "  ✅ PyYAML installed"
    else
        echo "  ⚠️  PyYAML not installed (optional, needed for YAML output)"
        echo "     Install: pip3 install PyYAML"
    fi
else
    echo "  ❌ Python3 not found"
    EXIT_CODE=1
fi

echo ""

# Test 6: Check for system tools
echo "🔧 Test 6: Checking system tools..."
REQUIRED_TOOLS=("nmap" "arp")
OPTIONAL_TOOLS=("hcitool" "traceroute" "fping" "docker")

for tool in "${REQUIRED_TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        echo "  ✅ $tool installed"
    else
        echo "  ❌ $tool not found (required)"
        echo "     macOS: brew install nmap"
        echo "     Ubuntu: sudo apt-get install nmap"
        EXIT_CODE=1
    fi
done

for tool in "${OPTIONAL_TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        VERSION=$($tool --version 2>&1 | head -n1 | cut -d' ' -f1-2 || echo "installed")
        echo "  ✅ $tool ($VERSION)"
    else
        echo "  ⚠️  $tool not found (optional, some features disabled)"
    fi
done

echo ""

# Test 7: Validate JSON example
echo "📊 Test 7: Validating example JSON..."
if command -v python3 &> /dev/null; then
    if python3 -c "import json; json.load(open('scripts/example-network-topology.json'))" 2>/dev/null; then
        echo "  ✅ example-network-topology.json is valid JSON"
    else
        echo "  ❌ example-network-topology.json has JSON errors"
        EXIT_CODE=1
    fi
else
    echo "  ⚠️  Python3 not available - skipping JSON validation"
fi

echo ""

# Test 8: Check README.md was updated
echo "📝 Test 8: Checking README.md integration..."
if grep -q "Network Topology Scanner" README.md; then
    echo "  ✅ README.md includes Network Scanner section"
else
    echo "  ⚠️  README.md may not include Network Scanner documentation"
fi

echo ""

# Test 9: Check output directory
echo "📂 Test 9: Checking output directory..."
if [ -d "network-scans" ]; then
    echo "  ✅ network-scans directory exists"
else
    echo "  ℹ️  network-scans directory will be created on first scan"
fi

echo ""

# Final summary
echo "╔═══════════════════════════════════════════════════════════════╗"
if [ $EXIT_CODE -eq 0 ]; then
    echo "║                    ✅ ALL TESTS PASSED                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Ready to scan! Run:"
    echo "  sudo ./scripts/scan-network-topology.sh"
    echo ""
    echo "For more information:"
    echo "  - Full docs: scripts/NETWORK_SCANNER_README.md"
    echo "  - Quick ref: scripts/QUICK_REFERENCE.md"
    echo "  - Integration: scripts/INTEGRATION_GUIDE.md"
else
    echo "║                ⚠️  SOME TESTS FAILED                          ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Issues found. Review errors above and install missing dependencies."
    echo ""
    echo "Quick fixes:"
    echo "  - Install Python deps: pip3 install -r scripts/requirements-network-scanner.txt"
    echo "  - Install nmap (macOS): brew install nmap"
    echo "  - Install nmap (Ubuntu): sudo apt-get install nmap"
fi

echo ""
exit $EXIT_CODE
