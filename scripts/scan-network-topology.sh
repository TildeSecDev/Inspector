#!/bin/bash
#
# Network Topology Scanner - Wrapper Script
# Performs comprehensive network reconnaissance and creates simulation configs
#
# Usage: ./scan-network-topology.sh [options]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_SCRIPT="${SCRIPT_DIR}/network-topology-mapper.py"
OUTPUT_DIR="${PROJECT_ROOT}/network-scans"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${OUTPUT_DIR}/network-topology-${TIMESTAMP}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Inspector Twin - Network Topology Scanner             ║${NC}"
echo -e "${BLUE}║     FOR AUTHORIZED LOCAL TESTING ONLY                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  This script requires root privileges for:${NC}"
    echo "   - Raw socket operations (ARP scanning)"
    echo "   - SYN stealth scanning"
    echo "   - OS detection"
    echo ""
    echo -e "${YELLOW}Re-running with sudo...${NC}"
    exec sudo "$0" "$@"
fi

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed.${NC}"
    exit 1
fi

# Check for required dependencies
echo -e "${BLUE}📦 Checking Python dependencies...${NC}"

# Try to import required modules
python3 -c "import scapy" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Python scapy module not found. Installing...${NC}"
    pip3 install scapy || {
        echo -e "${YELLOW}⚠️  Could not install scapy. ARP scanning will use fallback methods.${NC}"
    }
}

python3 -c "import yaml" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  PyYAML module not found. Installing...${NC}"
    pip3 install PyYAML || {
        echo -e "${YELLOW}⚠️  Could not install PyYAML. YAML output will be skipped.${NC}"
    }
}

# Check for system tools
echo -e "${BLUE}🔧 Checking system tools...${NC}"
MISSING_TOOLS=()

for tool in nmap arp; do
    if ! command -v "$tool" &> /dev/null; then
        MISSING_TOOLS+=("$tool")
        echo -e "${RED}  ❌ $tool not found${NC}"
    else
        echo -e "${GREEN}  ✓ $tool${NC}"
    fi
done

# Optional tools
for tool in hcitool traceroute fping; do
    if command -v "$tool" &> /dev/null; then
        echo -e "${GREEN}  ✓ $tool (optional)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  $tool not found (optional)${NC}"
    fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "Install missing tools:"
    echo "  macOS: brew install nmap"
    echo "  Ubuntu/Debian: sudo apt-get install nmap"
    echo "  RHEL/CentOS: sudo yum install nmap"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Scan Configuration:${NC}"
echo "  Output file: ${OUTPUT_FILE}"
echo "  Scan types: ARP, Nmap (intensive), Bluetooth"
echo "  Port scan: All 65535 ports"
echo "  Additional: OS detection, service versions, traceroute"
echo ""

# Parse arguments
INTERFACE=""
SKIP_PREREQ=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--interface)
            INTERFACE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --skip-prereq)
            SKIP_PREREQ="--skip-prereq-check"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -i, --interface <iface>  Network interface to scan (default: auto-detect)"
            echo "  -o, --output <file>      Output JSON file (default: network-scans/network-topology-TIMESTAMP.json)"
            echo "  --skip-prereq            Skip prerequisite checks"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build command
CMD="python3 ${PYTHON_SCRIPT} -o ${OUTPUT_FILE}"
if [ -n "$INTERFACE" ]; then
    CMD="$CMD -i $INTERFACE"
fi
if [ -n "$SKIP_PREREQ" ]; then
    CMD="$CMD $SKIP_PREREQ"
fi

echo -e "${BLUE}🚀 Starting network scan...${NC}"
echo ""

# Run the Python script
eval "$CMD"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 SCAN COMPLETE                              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📊 Results saved to:${NC}"
    echo "   JSON: ${OUTPUT_FILE}"
    echo "   Containerlab: ${OUTPUT_FILE%.json}-containerlab.yml"
    echo "   Docker Compose: ${OUTPUT_FILE%.json}-docker-compose.yml"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "   1. Review the discovered devices in: ${OUTPUT_FILE}"
    echo "   2. Deploy simulation with containerlab:"
    echo "      sudo containerlab deploy -t ${OUTPUT_FILE%.json}-containerlab.yml"
    echo "   3. Or use Docker Compose:"
    echo "      docker-compose -f ${OUTPUT_FILE%.json}-docker-compose.yml up -d"
    echo "   4. Configure OTLP forwarders on real devices to send to simulation"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Simulations may require manual adjustments for full functionality${NC}"
else
    echo ""
    echo -e "${RED}❌ Scan failed with exit code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
