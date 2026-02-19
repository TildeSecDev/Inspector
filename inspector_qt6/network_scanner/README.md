# Network Topology Scanner

Comprehensive network reconnaissance tool that maps your local network topology and generates configuration files for containerlab and Docker simulations.

## ⚠️ Authorization Notice

**FOR AUTHORIZED LOCAL TESTING ONLY**

This tool performs intensive network reconnaissance including:
- ARP scanning to discover devices
- Port scanning (all 65535 ports per device)
- OS and service version detection
- Network traceroute and topology mapping
- Bluetooth device discovery

**Only use on networks you own or have explicit written permission to test.**

## Features

- **Comprehensive Discovery**
  - ARP scanning using scapy or nmap
  - Intensive nmap scanning with all ports
  - OS detection and fingerprinting
  - Service version identification
  - Bluetooth device scanning
  - Traceroute for topology mapping

- **Device Categorization**
  - Routers
  - Switches
  - Access points
  - Endpoints (workstations, servers, IoT devices)
  - Network appliances

- **Topology Analysis**
  - Network path discovery
  - Device interconnection mapping
  - Hop count and distance metrics
  - Gateway and routing identification

- **Simulation-Ready Output**
  - Detailed JSON with all discovered information
  - Containerlab YAML configuration
  - Docker Compose YAML configuration
  - Ready for deployment with minimal adjustments

## Requirements

### System Tools (Required)
- `nmap` - Network scanning and OS detection
- `arp` - ARP table access
- Python 3.7+

### System Tools (Optional)
- `hcitool` - Bluetooth scanning
- `traceroute` - Additional path tracing
- `fping` - Fast ping sweep

### Python Dependencies
```bash
pip3 install -r requirements-network-scanner.txt
```

Or manually:
```bash
pip3 install scapy PyYAML
```

### Installation (macOS)
```bash
# Install nmap
brew install nmap

# Install Python dependencies
pip3 install scapy PyYAML

# Optional: Bluetooth tools
brew install bluez
```

### Installation (Ubuntu/Debian)
```bash
# Install nmap
sudo apt-get update
sudo apt-get install -y nmap

# Install Python dependencies
pip3 install scapy PyYAML

# Optional: Bluetooth tools
sudo apt-get install -y bluez bluez-tools
```

## Usage

### Basic Usage (Recommended)

Run the wrapper script with sudo:

```bash
sudo ./scan-network-topology.sh
```

This will:
1. Auto-detect your network
2. Perform comprehensive scans
3. Generate JSON, containerlab, and docker-compose configs
4. Save results to `../network-scans/network-topology-TIMESTAMP.json`

### Advanced Usage

Specify network interface:
```bash
sudo ./scan-network-topology.sh --interface en0
```

Custom output location:
```bash
sudo ./scan-network-topology.sh --output /path/to/output.json
```

Skip prerequisite checks (not recommended):
```bash
sudo ./scan-network-topology.sh --skip-prereq
```

### Direct Python Script Usage

```bash
# Basic scan
sudo python3 network-topology-mapper.py

# Custom output
sudo python3 network-topology-mapper.py -o custom-scan.json

# Specify interface
sudo python3 network-topology-mapper.py -i eth0

# Help
python3 network-topology-mapper.py --help
```

## Output Format

The scanner generates three files:

### 1. JSON Output (`network-topology-TIMESTAMP.json`)

Complete detailed output including:

```json
{
  "metadata": {
    "scan_time": "2026-02-18T...",
    "scanner_version": "1.0.0",
    "network_info": {
      "local_ip": "192.168.1.100",
      "gateway": "192.168.1.1",
      "network_cidr": "192.168.1.0/24"
    },
    "topology": {
      "gateway": "192.168.1.1",
      "routers": [...],
      "switches": [...],
      "access_points": [...],
      "endpoints": [...],
      "connections": [...]
    }
  },
  "devices": {
    "192.168.1.1": {
      "ip": "192.168.1.1",
      "mac": "00:11:22:33:44:55",
      "hostname": "router.local",
      "device_type": "router",
      "os_detection": {
        "name": "Linux 5.4",
        "accuracy": "95%",
        "vendor": "Cisco"
      },
      "ports": [...],
      "services": [
        {
          "port": 80,
          "protocol": "tcp",
          "service": "http",
          "product": "nginx",
          "version": "1.21.0"
        }
      ],
      "distance_hops": 1,
      "traceroute": [...]
    }
  },
  "bluetooth_devices": [...],
  "containerlab_format": {...},
  "docker_compose_format": {...}
}
```

### 2. Containerlab Config (`network-topology-TIMESTAMP-containerlab.yml`)

Ready-to-use containerlab topology:

```yaml
name: inspector-twin-network
topology:
  nodes:
    node_192_168_1_1:
      kind: vr-sros
      image: vrnetlab/vr-sros:latest
      mgmt_ipv4: 192.168.1.1
      ports: [22, 80, 443]
      labels:
        discovered_mac: "00:11:22:33:44:55"
        discovered_os: "Linux 5.4"
        device_type: "router"
  links:
    - endpoints: ["node_192_168_1_1:eth0", "node_192_168_1_100:eth0"]
```

### 3. Docker Compose Config (`network-topology-TIMESTAMP-docker-compose.yml`)

Docker Compose configuration:

```yaml
version: '3.8'
services:
  node_192_168_1_1:
    image: ubuntu:latest
    container_name: node_192_168_1_1
    hostname: router.local
    networks:
      inspector_network:
        ipv4_address: 192.168.1.1
    labels:
      inspector.device_type: router
      inspector.mac: "00:11:22:33:44:55"
    ports:
      - "80:80"
      - "443:443"
networks:
  inspector_network:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.1.0/24
```

## Deploying Simulations

### Using Containerlab

```bash
# Deploy the topology
sudo containerlab deploy -t network-scans/network-topology-TIMESTAMP-containerlab.yml

# Check status
sudo containerlab inspect -t network-scans/network-topology-TIMESTAMP-containerlab.yml

# Destroy topology
sudo containerlab destroy -t network-scans/network-topology-TIMESTAMP-containerlab.yml
```

### Using Docker Compose

```bash
# Start the simulation
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml up -d

# Check status
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml ps

# Stop simulation
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml down
```

## OTLP Forwarder Configuration

After creating the simulation, configure OTLP forwarders on your real devices to send telemetry to the simulated environment:

### OpenTelemetry Collector Configuration

On real devices, configure the OTLP exporter to point to your simulation:

```yaml
exporters:
  otlp/simulation:
    endpoint: http://simulation-host:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      exporters: [otlp/simulation]
    metrics:
      exporters: [otlp/simulation]
    logs:
      exporters: [otlp/simulation]
```

### Forwarding Specific Logs

Configure log forwarding using the Inspector Twin OTLP collector:

```bash
# On real device, forward logs to simulation
curl -X POST http://simulation-host:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d @logs-payload.json
```

## Scan Duration

- **ARP Scan**: 30-60 seconds for typical networks
- **Bluetooth Scan**: 30 seconds
- **Nmap Intensive Scan**: Up to 10 minutes **per device**

For a network with 10 devices, expect **1-2 hours** total scan time.

## Troubleshooting

### "Permission denied" errors
Run with `sudo`:
```bash
sudo ./scan-network-topology.sh
```

### "nmap not found"
Install nmap:
```bash
# macOS
brew install nmap

# Ubuntu/Debian
sudo apt-get install nmap
```

### Scapy import errors
Install Python dependencies:
```bash
pip3 install scapy
```

### Slow scanning
- Reduce timeout in the Python script
- Use a faster timing template in nmap (change `-T4` to `-T5`)
- Skip full port scan (modify script to scan common ports only)

### No devices found
- Check network connectivity
- Verify correct network interface
- Ensure firewall allows scanning
- Try specifying interface manually: `--interface en0`

## Security Considerations

1. **Authorization**: Always obtain written permission before scanning networks
2. **Legal Compliance**: Unauthorized scanning may violate laws (CFAA, GDMA, etc.)
3. **Network Impact**: Intensive scanning may trigger IDS/IPS alerts or cause network congestion
4. **Data Sensitivity**: Scan results may contain sensitive information - store securely
5. **Simulation Isolation**: Keep simulations isolated from production networks

## Integration with Inspector Twin

The scan results integrate with Inspector Twin's architecture:

1. **Discover** → This scanner maps the real network
2. **Simulate** → Containerlab/Docker creates digital twin
3. **Test** → Inspector Twin performs security assessments on simulation
4. **Monitor** → OTLP forwarders send real telemetry to simulation
5. **Analyze** → Compare real vs simulated behavior

## Example Workflow

```bash
# 1. Scan your authorized local network
sudo ./scan-network-topology.sh

# 2. Review results
cat network-scans/network-topology-20260218_120000.json | jq '.devices | keys'

# 3. Deploy simulation
sudo containerlab deploy -t network-scans/network-topology-20260218_120000-containerlab.yml

# 4. Configure OTLP forwarders on real devices (see OTLP section)

# 5. Run Inspector Twin security checks on simulation

# 6. Clean up
sudo containerlab destroy -t network-scans/network-topology-20260218_120000-containerlab.yml
```

## Limitations

- **Accuracy**: Automated detection may misidentify device types
- **Completeness**: Some devices may not respond to scans (firewalls, security devices)
- **Connections**: Layer 2 topology requires additional tools (CDP/LLDP)
- **Simulations**: Generated configs may require manual tuning
- **Performance**: Real device performance may differ from simulations

## Future Enhancements

- [ ] Layer 2 topology discovery (CDP/LLDP)
- [ ] WiFi network mapping
- [ ] Packet capture integration
- [ ] Real-time monitoring integration
- [ ] Machine learning for device classification
- [ ] Automated vulnerability assessment
- [ ] Integration with asset management systems

## License

Part of Inspector Twin project. For authorized security testing only.

## Support

For issues or questions, refer to the main Inspector Twin documentation.
