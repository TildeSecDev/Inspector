# Network Topology Scanner - Quick Reference

## Prerequisites Installation

### macOS
```bash
brew install nmap
pip3 install scapy PyYAML
```

### Ubuntu/Debian
```bash
sudo apt-get update && sudo apt-get install -y nmap python3-pip
pip3 install scapy PyYAML
```

## Basic Commands

### Run Full Network Scan
```bash
sudo ./scripts/scan-network-topology.sh
```

### Specify Network Interface
```bash
sudo ./scripts/scan-network-topology.sh --interface en0
```

### Custom Output Location
```bash
sudo ./scripts/scan-network-topology.sh --output /path/to/scan.json
```

## Deploy Simulations

### Containerlab
```bash
# Deploy
sudo containerlab deploy -t network-scans/network-topology-TIMESTAMP-containerlab.yml

# Inspect
sudo containerlab inspect

# Destroy
sudo containerlab destroy -t network-scans/network-topology-TIMESTAMP-containerlab.yml
```

### Docker Compose
```bash
# Start
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml up -d

# Status
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml ps

# Stop
docker-compose -f network-scans/network-topology-TIMESTAMP-docker-compose.yml down
```

## OTLP Collector Setup

### Run OTLP Collector
```bash
docker run -d \
  --name otlp-collector \
  --network inspector_network \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otlp-collector-config.yaml:/etc/otel-collector-config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config=/etc/otel-collector-config.yaml
```

### Test OTLP Endpoint
```bash
curl -v http://localhost:4318/v1/traces
```

## Device Configuration

### Linux Host - Forward Telemetry
```bash
# Download OpenTelemetry Collector
curl -L -O https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.tar.gz
tar -xzf otelcol-contrib_linux_amd64.tar.gz

# Run with config pointing to Inspector Twin
./otelcol-contrib --config=/etc/otel-collector-config.yaml
```

### Test Telemetry Forwarding
```bash
# Send test trace
curl -X POST http://INSPECTOR_TWIN_IP:4318/v1/traces \
  -H "Content-Type: application/json" \
  -H "X-Device-IP: 192.168.1.10" \
  -d @test-trace.json
```

## Analyze Results

### View JSON Summary
```bash
# List all devices
cat network-scans/network-topology-*.json | jq '.devices | keys'

# View specific device
cat network-scans/network-topology-*.json | jq '.devices["192.168.1.1"]'

# View topology
cat network-scans/network-topology-*.json | jq '.metadata.topology'

# Count devices by type
cat network-scans/network-topology-*.json | jq '.devices | group_by(.device_type) | map({type: .[0].device_type, count: length})'
```

### Access Simulated Devices
```bash
# Containerlab
sudo docker exec -it clab-inspector-twin-network-node_192_168_1_1 bash

# Docker Compose
docker exec -it node_192_168_1_1 bash
```

## Monitoring

### Check OTLP Collector Logs
```bash
docker logs -f otlp-collector
```

### Check Simulation Network
```bash
# List containers
docker ps

# Inspect network
docker network inspect inspector_network

# Test connectivity
docker exec node_192_168_1_1 ping node_192_168_1_2
```

## Troubleshooting

### Permission Denied
```bash
# Ensure running with sudo
sudo ./scripts/scan-network-topology.sh
```

### Nmap Not Found
```bash
# macOS
brew install nmap

# Ubuntu/Debian
sudo apt-get install nmap
```

### Python Dependencies Missing
```bash
pip3 install -r scripts/requirements-network-scanner.txt
```

### OTLP Connection Refused
```bash
# Check collector is running
docker ps | grep otlp

# Check ports
netstat -an | grep 4317

# Check firewall
sudo iptables -L -n | grep 4317
```

### Simulation Containers Won't Start
```bash
# Check Docker daemon
docker info

# Check network conflicts
docker network ls
docker network inspect inspector_network

# Check logs
docker-compose -f network-scans/network-topology-*-docker-compose.yml logs
```

## File Locations

- **Scan Output**: `network-scans/network-topology-TIMESTAMP.json`
- **Containerlab Config**: `network-scans/network-topology-TIMESTAMP-containerlab.yml`
- **Docker Compose Config**: `network-scans/network-topology-TIMESTAMP-docker-compose.yml`
- **OTLP Collector Config**: `otlp-collector-config.yaml`
- **Scanner Script**: `scripts/network-topology-mapper.py`
- **Wrapper Script**: `scripts/scan-network-topology.sh`

## Common Patterns

### Scan → Deploy → Monitor
```bash
# 1. Scan network
sudo ./scripts/scan-network-topology.sh

# 2. Deploy simulation
docker-compose -f network-scans/network-topology-*.json up -d

# 3. Start OTLP collector
docker run -d --name otlp-collector ...

# 4. Configure real devices to forward telemetry

# 5. Monitor in Inspector Twin UI
open http://localhost:3000
```

### Update Scan After Network Changes
```bash
# 1. Stop simulation
docker-compose -f network-scans/network-topology-OLD.yml down

# 2. Rescan network
sudo ./scripts/scan-network-topology.sh

# 3. Redeploy with new config
docker-compose -f network-scans/network-topology-NEW.yml up -d
```

### Export Specific Device Config
```bash
# Extract single device
cat network-scans/network-topology-*.json | \
  jq '.devices["192.168.1.1"]' > device-192-168-1-1.json

# Generate Docker run command
cat device-192-168-1-1.json | \
  jq -r '"docker run -d --name " + (.hostname // .ip) + " --ip " + .ip + " ubuntu:latest"'
```

## Performance Tips

### Faster Scans (Less Detail)
Edit `network-topology-mapper.py`:
```python
# Change from:
cmd = ["nmap", "-sS", "-sV", "-O", "-A", "-T4", "--traceroute", "-p-", target]

# To (scan only common ports):
cmd = ["nmap", "-sS", "-sV", "-O", "-T5", "--top-ports", "1000", target]
```

### Parallel Scanning
```bash
# Scan multiple subnets in parallel
sudo ./scripts/scan-network-topology.sh --interface en0 &
sudo ./scripts/scan-network-topology.sh --interface en1 &
wait
```

## Security Best Practices

1. ✅ **Always obtain written authorization** before scanning networks
2. ✅ **Run scans during maintenance windows** to minimize disruption
3. ✅ **Isolate simulation networks** from production
4. ✅ **Encrypt OTLP traffic** with TLS in production
5. ✅ **Sanitize logs** before forwarding to remove sensitive data
6. ✅ **Use authentication** for OTLP endpoints
7. ✅ **Monitor scan impact** on network performance
8. ✅ **Store scan results securely** - they contain network intelligence

## Example Workflow

```bash
# 1. Install dependencies
brew install nmap
pip3 install scapy PyYAML

# 2. Scan authorized local network
sudo ./scripts/scan-network-topology.sh

# 3. Review results
cat network-scans/network-topology-*.json | jq '.metadata.topology'

# 4. Deploy simulation
docker-compose -f network-scans/network-topology-*-docker-compose.yml up -d

# 5. Verify simulation
docker ps
docker network inspect inspector_network

# 6. Run OTLP collector (see INTEGRATION_GUIDE.md)
docker run -d --name otlp-collector ...

# 7. Configure device forwarding (see INTEGRATION_GUIDE.md)
# ... configure real devices ...

# 8. Open Inspector Twin
open http://localhost:3000

# 9. Run security tests on simulation

# 10. Clean up
docker-compose -f network-scans/network-topology-*-docker-compose.yml down
```

## Resources

- [Full Documentation](./NETWORK_SCANNER_README.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Example Output](./example-network-topology.json)
- [Inspector Twin Main README](../README.md)
