# Network Scanner Integration with Inspector Twin

This document explains how to integrate the Network Topology Scanner with Inspector Twin's digital twin simulation and OTLP telemetry forwarding.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   REAL NETWORK (Authorized)                        │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  Router  │─────│  Switch  │─────│ Endpoint │                   │
│  └────┬─────┘     └──────────┘     └──────────┘                   │
│       │                                                             │
│       │ OTLP Telemetry                                             │
│       ↓                                                             │
└───────┼─────────────────────────────────────────────────────────────┘
        │
        │ Forward logs, metrics, traces
        ↓
┌───────┼─────────────────────────────────────────────────────────────┐
│       │            INSPECTOR TWIN SIMULATION                        │
│       ↓                                                             │
│  ┌──────────────────┐                                              │
│  │ OTLP Collector   │                                              │
│  │ (OpenTelemetry)  │                                              │
│  └────────┬─────────┘                                              │
│           │                                                         │
│           ↓                                                         │
│  ┌─────────────────────────────────────────────────────┐           │
│  │       Digital Twin Network (Containerlab/Docker)    │           │
│  │  ┌──────────┐     ┌──────────┐     ┌──────────┐   │           │
│  │  │  Router  │─────│  Switch  │─────│ Endpoint │   │           │
│  │  │  (sim)   │     │  (sim)   │     │  (sim)   │   │           │
│  │  └──────────┘     └──────────┘     └──────────┘   │           │
│  └─────────────────────────────────────────────────────┘           │
│           │                                                         │
│           ↓                                                         │
│  ┌────────────────────┐                                            │
│  │ Security Testing   │                                            │
│  │ & Analysis         │                                            │
│  └────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow

### Phase 1: Network Discovery

1. **Run the Network Scanner**
   ```bash
   sudo ./scripts/scan-network-topology.sh
   ```

2. **Review Discovered Devices**
   ```bash
   cat network-scans/network-topology-*.json | jq '.devices | keys'
   ```

3. **Analyze Topology**
   ```bash
   cat network-scans/network-topology-*.json | jq '.metadata.topology'
   ```

### Phase 2: Deploy Digital Twin Simulation

#### Option A: Using Containerlab (Recommended for Network Devices)

```bash
# Deploy the topology
sudo containerlab deploy -t network-scans/network-topology-*-containerlab.yml

# Verify deployment
sudo containerlab inspect

# Access a simulated device
sudo docker exec -it clab-inspector-twin-network-node_192_168_1_1 bash
```

#### Option B: Using Docker Compose (Recommended for Mixed Environments)

```bash
# Start the simulation
docker-compose -f network-scans/network-topology-*-docker-compose.yml up -d

# Check status
docker-compose -f network-scans/network-topology-*-docker-compose.yml ps

# Access a container
docker exec -it node_192_168_1_1 bash
```

### Phase 3: Configure OTLP Collector

1. **Deploy OTLP Collector in Simulation**

Create `otlp-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  
  # Add resource attributes
  resource:
    attributes:
      - key: service.namespace
        value: "inspector-twin"
        action: upsert
      - key: environment
        value: "simulation"
        action: upsert

  # Filter and route based on device
  routing:
    from_attribute: net.host.ip
    table:
      - value: 192.168.1.1
        exporters: [logging, otlp/router]
      - value: 192.168.1.2
        exporters: [logging, otlp/switch]
      - value: 192.168.1.10
        exporters: [logging, otlp/endpoint]

exporters:
  # Debug exporter
  logging:
    loglevel: debug
  
  # Forward to Inspector Twin analysis
  otlp/inspector:
    endpoint: localhost:4317
    tls:
      insecure: true
  
  # Per-device exporters
  otlp/router:
    endpoint: node_192_168_1_1:4317
    tls:
      insecure: true
  
  otlp/switch:
    endpoint: node_192_168_1_2:4317
    tls:
      insecure: true
  
  otlp/endpoint:
    endpoint: node_192_168_1_10:4317
    tls:
      insecure: true

  # Store in Inspector Twin database
  prometheusremotewrite:
    endpoint: http://localhost:9090/api/v1/write

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource, routing]
      exporters: [logging, otlp/inspector]
    
    metrics:
      receivers: [otlp]
      processors: [batch, resource, routing]
      exporters: [logging, otlp/inspector, prometheusremotewrite]
    
    logs:
      receivers: [otlp]
      processors: [batch, resource, routing]
      exporters: [logging, otlp/inspector]
```

2. **Run OTLP Collector**

```bash
# Using Docker
docker run -d \
  --name otlp-collector \
  --network inspector_network \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otlp-collector-config.yaml:/etc/otel-collector-config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config=/etc/otel-collector-config.yaml

# Or use the Inspector Twin built-in collector
cd opentelemetry-collector
./bin/otelcorecol_darwin_arm64 --config=otlp-collector-config.yaml
```

### Phase 4: Configure Real Devices to Forward Telemetry

#### Router/Switch Configuration (Cisco IOS Example)

```cisco
! Enable NetFlow/IPFIX export (similar to OTLP)
flow exporter OTLP_EXPORT
  destination <INSPECTOR_TWIN_IP>
  transport udp 4317
  export-protocol ipfix
  template data timeout 60

flow monitor OTLP_MONITOR
  exporter OTLP_EXPORT
  record netflow ipv4 original-input

interface GigabitEthernet0/1
  ip flow monitor OTLP_MONITOR input
  ip flow monitor OTLP_MONITOR output
```

#### Linux Server Configuration

Install OpenTelemetry agent:

```bash
# Download and install OTLP agent
curl -L -O https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_linux_amd64.tar.gz
tar -xzf otelcol-contrib_linux_amd64.tar.gz

# Create config
cat > /etc/otel-collector-config.yaml <<EOF
receivers:
  # System metrics
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      filesystem:
      network:
      load:
  
  # Log files
  filelog:
    include:
      - /var/log/syslog
      - /var/log/auth.log
    include_file_path: true
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%d %H:%M:%S'

exporters:
  otlp:
    endpoint: <INSPECTOR_TWIN_IP>:4317
    tls:
      insecure: true
    headers:
      X-Device-IP: "192.168.1.10"
      X-Device-Type: "endpoint"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      exporters: [otlp]
    logs:
      receivers: [filelog]
      exporters: [otlp]
EOF

# Run collector
./otelcol-contrib --config=/etc/otel-collector-config.yaml
```

#### Windows Workstation Configuration

```powershell
# Install OpenTelemetry Collector
Invoke-WebRequest -Uri https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol-contrib_windows_amd64.tar.gz -OutFile otelcol.tar.gz
tar -xzf otelcol.tar.gz

# Create config (similar to Linux)
# ... (use same config structure)

# Run as service
.\otelcol-contrib.exe --config=C:\otel-collector-config.yaml
```

### Phase 5: Test Telemetry Flow

1. **Verify OTLP Collector is Receiving Data**

```bash
# Check collector logs
docker logs -f otlp-collector

# Should see:
# "Traces received from 192.168.1.10"
# "Metrics received from 192.168.1.1"
# "Logs received from 192.168.1.2"
```

2. **Query Metrics in Inspector Twin**

```bash
# Use Inspector Twin UI or API
curl http://localhost:3000/api/metrics?device=192.168.1.1

# Or check Prometheus directly
curl http://localhost:9090/api/v1/query?query=node_cpu_seconds_total{device="192.168.1.1"}
```

3. **View Traces**

```bash
# Open Inspector Twin traces view
open http://localhost:3000/traces

# Filter by device IP
# Analyze trace spans and latencies
```

### Phase 6: Run Security Tests on Simulation

Now that the simulation receives real telemetry, run security assessments:

```bash
# Run Inspector Twin security checks
# This will test against the simulated network while using real device behavior data

# Open Inspector Twin UI
open http://localhost:3000

# Navigate to Security Tests
# Select simulated devices
# Run vulnerability scans, penetration tests, etc.
```

## Integration Points

### 1. Device Discovery → Inspector Twin UI

Update [SettingsPage.tsx](SettingsPage.tsx) to load discovered devices:

```typescript
// Add to SettingsPage.tsx
const loadNetworkScan = async (scanFile: string) => {
  const response = await fetch(`/network-scans/${scanFile}`);
  const scan = await response.json();
  
  // Register each device as an endpoint
  for (const [ip, device] of Object.entries(scan.devices)) {
    await registerEndpoint({
      name: device.hostname || ip,
      baseUrl: `http://${ip}`,
      healthPath: '/health',
      metadata: {
        mac: device.mac,
        os: device.os_detection?.name,
        device_type: device.device_type
      }
    });
  }
};
```

### 2. Real-time Monitoring Dashboard

Create a dashboard showing both real and simulated devices:

```typescript
// apps/renderer/src/pages/MonitoringDashboard.tsx
export function MonitoringDashboard() {
  const [realDevices, setRealDevices] = useState([]);
  const [simulatedDevices, setSimulatedDevices] = useState([]);
  
  // Fetch real device telemetry
  useEffect(() => {
    const fetchRealDevices = async () => {
      const response = await fetch('/api/otlp/real-devices');
      setRealDevices(await response.json());
    };
    
    const interval = setInterval(fetchRealDevices, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Compare real vs simulated behavior
  const compareDevices = (realIP: string, simIP: string) => {
    // Compare metrics, traces, logs
    // Highlight anomalies
  };
  
  return (
    <div className="monitoring-dashboard">
      <h2>Real Network</h2>
      {realDevices.map(device => (
        <DeviceCard key={device.ip} device={device} type="real" />
      ))}
      
      <h2>Simulated Network</h2>
      {simulatedDevices.map(device => (
        <DeviceCard key={device.ip} device={device} type="simulated" />
      ))}
    </div>
  );
}
```

### 3. OTLP Forwarder Configuration UI

Add UI to configure OTLP forwarding:

```typescript
// Add to SettingsPage.tsx
const configureOTLPForwarding = async (deviceIP: string) => {
  const config = generateOTLPConfig(deviceIP);
  
  // Display config for user to apply on real device
  setOTLPConfig(config);
  setShowOTLPInstructions(true);
};
```

## Advanced Use Cases

### 1. Behavior Anomaly Detection

```yaml
# OTLP processor config for anomaly detection
processors:
  spanmetrics:
    metrics_exporter: prometheus
    latency_histogram_buckets: [2ms, 4ms, 8ms, 16ms, 32ms, 64ms, 128ms, 256ms, 512ms, 1s, 2s, 4s, 8s]
    dimensions:
      - name: http.method
      - name: http.status_code
  
  # Detect anomalies
  filter/anomaly:
    traces:
      span:
        - 'attributes["http.status_code"] >= 400'
        - 'duration > 5000ms'
```

### 2. Security Event Correlation

```yaml
# Correlate security events from real devices
processors:
  transform:
    log_statements:
      - context: log
        statements:
          - set(attributes["security.event"], true) where body matches "authentication failed|unauthorized|access denied"
          - set(severity_number, 17) where attributes["security.event"] == true
```

### 3. Automated Incident Response

```typescript
// Monitor OTLP stream for security events
const monitorSecurityEvents = async () => {
  const stream = await fetch('/api/otlp/stream');
  
  for await (const event of stream) {
    if (event.severity === 'CRITICAL') {
      // Trigger security response in simulation
      await triggerSimulatedResponse(event.device_ip);
      
      // Alert operator
      await sendAlert(event);
    }
  }
};
```

## Troubleshooting

### OTLP Connection Issues

```bash
# Test OTLP endpoint
curl -v http://inspector-twin-ip:4318/v1/traces

# Check firewall
sudo iptables -L -n | grep 4317
sudo iptables -A INPUT -p tcp --dport 4317 -j ACCEPT

# Test with sample data
curl -X POST http://inspector-twin-ip:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"test"}}]},"scopeSpans":[{"spans":[{"traceId":"abc","spanId":"def","name":"test","kind":1,"startTimeUnixNano":"1234","endTimeUnixNano":"5678"}]}]}]}'
```

### Simulation Network Connectivity

```bash
# Verify containers can reach OTLP collector
docker exec node_192_168_1_1 ping otlp-collector

# Check network
docker network inspect inspector_network

# Verify ports
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Security Considerations

1. **Isolate Simulation**: Keep simulated network separate from production
2. **Encrypt OTLP**: Use TLS for OTLP connections in production
3. **Authenticate Sources**: Verify telemetry sources with API keys/tokens
4. **Rate Limiting**: Prevent telemetry flooding
5. **Data Sanitization**: Remove sensitive data from forwarded logs

## Next Steps

1. Review scan results in `network-scans/`
2. Deploy simulation using containerlab or docker-compose
3. Configure OTLP collector
4. Set up real device forwarding
5. Monitor telemetry flow
6. Run security tests
7. Analyze results in Inspector Twin UI

## Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Containerlab Documentation](https://containerlab.dev/)
- [Inspector Twin Documentation](../README.md)
- [Network Scanner README](./NETWORK_SCANNER_README.md)
