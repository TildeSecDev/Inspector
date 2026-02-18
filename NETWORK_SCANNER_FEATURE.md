# Network Topology Scanner - Feature Summary

## Overview

A comprehensive network reconnaissance and topology mapping system has been added to Inspector Twin. This feature allows you to scan authorized local networks, discover devices, map topology, and automatically generate simulation configurations for containerlab and Docker.

## What Was Created

### Core Scripts

1. **`scripts/network-topology-mapper.py`** (28KB)
   - Main Python script for network discovery
   - ARP scanning (using scapy or nmap fallback)
   - Intensive nmap scanning (all 65535 ports, OS detection, service versions)
   - Bluetooth device discovery
   - Network traceroute and topology analysis
   - JSON output with complete device inventory
   - Automatic generation of containerlab and docker-compose configs
   - Requires: Python 3.7+, nmap, optional (scapy, hcitool, PyYAML)

2. **`scripts/scan-network-topology.sh`** (6.2KB)
   - Bash wrapper script for easy execution
   - Auto-checks for root privileges
   - Validates dependencies
   - Provides colored output and progress indicators
   - Handles output file naming with timestamps
   - Integrates with Inspector Twin workflow

### Configuration & Dependencies

3. **`scripts/requirements-network-scanner.txt`**
   - Python dependencies: scapy>=2.5.0, PyYAML>=6.0
   - Install with: `pip3 install -r requirements-network-scanner.txt`

### Documentation

4. **`scripts/NETWORK_SCANNER_README.md`** (Comprehensive)
   - Complete feature documentation
   - Installation instructions for macOS, Ubuntu/Debian
   - Usage examples and command reference
   - Output format documentation
   - Deployment instructions for containerlab/docker-compose
   - OTLP forwarder configuration
   - Troubleshooting guide
   - Security considerations
   - Example workflows

5. **`scripts/INTEGRATION_GUIDE.md`** (Advanced)
   - Integration with Inspector Twin application
   - OTLP collector configuration
   - Real device telemetry forwarding setup
   - Cisco router/switch configuration examples
   - Linux/Windows OTLP agent setup
   - Dashboard and monitoring integration
   - Security event correlation
   - Automated incident response patterns

6. **`scripts/QUICK_REFERENCE.md`** (Cheat Sheet)
   - Quick command reference
   - Common patterns and workflows
   - Troubleshooting tips
   - Performance optimization
   - Security best practices

7. **`scripts/example-network-topology.json`** (Example Output)
   - Realistic example of scanner output
   - Shows device discovery results
   - Demonstrates topology analysis
   - Includes containerlab and docker-compose formats
   - Use as reference for integration

### Documentation Updates

8. **`README.md`** (Updated)
   - Added "Network Topology Scanner" section
   - Quick start guide for scanner
   - Links to detailed documentation
   - Use case descriptions

## How It Works

### Discovery Phase

```
1. ARP Scan → Discover live hosts on local network
2. Bluetooth Scan → Find nearby Bluetooth devices
3. Nmap Intensive Scan → For each discovered device:
   - Scan all 65535 ports
   - Detect operating system
   - Identify service versions
   - Trace network path (hops)
   - Measure latency
```

### Analysis Phase

```
4. Device Categorization → Router, Switch, Access Point, Endpoint
5. Topology Mapping → Identify connections between devices
6. Gateway Detection → Find network gateway and routing
7. Service Analysis → Catalog running services and versions
```

### Output Generation

```
8. JSON Export → Complete device inventory and topology
9. Containerlab Config → Ready-to-deploy network simulation
10. Docker Compose Config → Container-based digital twin
```

## Output Structure

### JSON Output
```json
{
  "metadata": {
    "scan_time": "...",
    "network_info": { "gateway": "...", "network_cidr": "..." },
    "topology": {
      "gateway": "192.168.1.1",
      "routers": [...],
      "switches": [...],
      "endpoints": [...]
    }
  },
  "devices": {
    "192.168.1.1": {
      "ip": "192.168.1.1",
      "mac": "00:11:22:33:44:55",
      "hostname": "router.local",
      "device_type": "router",
      "os_detection": { "name": "Linux 5.15", "accuracy": "95%" },
      "ports": [...],
      "services": [ { "port": 80, "service": "http", "version": "..." } ],
      "distance_hops": 1,
      "traceroute": [...]
    }
  },
  "containerlab_format": { ... },
  "docker_compose_format": { ... }
}
```

### Containerlab YAML
```yaml
name: inspector-twin-network
topology:
  nodes:
    node_192_168_1_1:
      kind: linux
      image: ubuntu:latest
      mgmt_ipv4: 192.168.1.1
  links:
    - endpoints: ["node_192_168_1_1:eth0", "node_192_168_1_2:eth0"]
```

### Docker Compose YAML
```yaml
version: '3.8'
services:
  node_192_168_1_1:
    image: ubuntu:latest
    hostname: router.local
    networks:
      inspector_network:
        ipv4_address: 192.168.1.1
networks:
  inspector_network:
    driver: bridge
```

## Integration with Inspector Twin

### Phase 1: Discovery
```bash
# Scan authorized local network
sudo ./scripts/scan-network-topology.sh
```

### Phase 2: Simulation
```bash
# Deploy digital twin
docker-compose -f network-scans/network-topology-*-docker-compose.yml up -d
```

### Phase 3: Telemetry
```bash
# Configure real devices to forward OTLP telemetry to simulation
# See INTEGRATION_GUIDE.md for detailed configuration
```

### Phase 4: Testing
```
# Use Inspector Twin UI to:
1. Run security assessments on simulation
2. Monitor real device telemetry
3. Compare real vs simulated behavior
4. Detect anomalies and vulnerabilities
```

## Use Cases

### 1. Network Documentation
- Automatically document network topology
- Track device inventory
- Generate network diagrams

### 2. Security Assessment
- Identify exposed services
- Map attack surface
- Find vulnerable versions
- Detect misconfigurations

### 3. Digital Twin Creation
- Replicate real network in containerlab/docker
- Test changes before production
- Simulate security scenarios
- Train incident response

### 4. Compliance & Audit
- Asset inventory for compliance
- Service version tracking
- Network segmentation verification
- Security control validation

### 5. Behavior Analysis
- Forward real telemetry to simulation
- Compare expected vs actual behavior
- Detect anomalies and intrusions
- Validate security controls

## Quick Start

### Installation
```bash
# macOS
brew install nmap
pip3 install scapy PyYAML

# Ubuntu/Debian
sudo apt-get install nmap
pip3 install scapy PyYAML
```

### Basic Usage
```bash
# Scan network (requires sudo)
sudo ./scripts/scan-network-topology.sh

# Review results
cat network-scans/network-topology-*.json | jq '.devices | keys'

# Deploy simulation
docker-compose -f network-scans/network-topology-*-docker-compose.yml up -d

# Open Inspector Twin
open http://localhost:3000
```

## Performance Expectations

- **ARP Scan**: 30-60 seconds
- **Bluetooth Scan**: 30 seconds
- **Nmap Per Device**: 5-10 minutes (full port scan)
- **Total Time**: ~1-2 hours for 10 devices

Faster scans possible by:
- Scanning common ports only (--top-ports 1000)
- Using faster timing (-T5)
- Parallel scanning of multiple subnets

## Security & Legal Considerations

⚠️ **CRITICAL**: This tool performs intensive network reconnaissance

✅ **Authorized Use Only**:
- Obtain written permission before scanning any network
- Only scan networks you own or manage
- Follow organizational security policies
- Comply with local laws (CFAA, GDPR, etc.)

✅ **Best Practices**:
- Run during maintenance windows
- Monitor scan impact on network
- Store results securely
- Isolate simulations from production
- Encrypt OTLP traffic
- Sanitize logs before forwarding

## Limitations

- **Layer 2**: Limited layer 2 topology discovery (needs CDP/LLDP)
- **Accuracy**: Device type detection may require manual adjustment
- **Completeness**: Some devices may not respond to scans
- **Simulation**: Generated configs may need tuning for full functionality
- **Performance**: Real device performance may differ from simulation

## Future Enhancements

Potential future additions:
- [ ] Layer 2 discovery (CDP/LLDP parsing)
- [ ] WiFi network mapping
- [ ] Passive network traffic analysis
- [ ] Machine learning device classification
- [ ] GUI integration with Inspector Twin UI
- [ ] Real-time network monitoring
- [ ] Automated vulnerability assessment
- [ ] Asset management system integration

## File Locations

All scanner files in `scripts/` directory:

- **Scripts**: `network-topology-mapper.py`, `scan-network-topology.sh`
- **Dependencies**: `requirements-network-scanner.txt`
- **Documentation**: `NETWORK_SCANNER_README.md`, `INTEGRATION_GUIDE.md`, `QUICK_REFERENCE.md`
- **Example**: `example-network-topology.json`
- **Output**: `../network-scans/network-topology-TIMESTAMP.json`

## Getting Help

1. **Quick Commands**: See `QUICK_REFERENCE.md`
2. **Full Documentation**: See `NETWORK_SCANNER_README.md`
3. **Integration**: See `INTEGRATION_GUIDE.md`
4. **Issues**: Check troubleshooting sections in documentation

## Summary

The Network Topology Scanner adds powerful network discovery and simulation capabilities to Inspector Twin:

✅ Comprehensive device discovery (ARP, Nmap, Bluetooth)  
✅ Detailed device fingerprinting (OS, services, versions)  
✅ Topology mapping (connections, routing, hops)  
✅ Simulation-ready output (JSON, Containerlab, Docker Compose)  
✅ OTLP telemetry forwarding support  
✅ Integration with Inspector Twin security testing  
✅ Complete documentation and examples  

**Start scanning**: `sudo ./scripts/scan-network-topology.sh`

---

*For authorized local testing only. Always obtain written permission before scanning networks.*
