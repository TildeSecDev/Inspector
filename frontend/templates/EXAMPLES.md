# Example Topologies

This directory contains example topology files that demonstrate the structure and capabilities of the topology builder.

## Files

### `basic-network.json`
Simple 2-node network topology for learning/testing.

**Topology:**
```
PC1 <---> PC2
```

**Key Features:**
- Two Alpine Linux containers
- Direct link between nodes
- Simple IP addressing (10.0.10.0/24)
- No routers or advanced configuration

**Use Case:** Testing basic connectivity, learning the topology format

---

### `enterprise-dt.json`
Full enterprise network based on real-world twin.yml topology.

**Topology:**
```
         ISP (203.0.113.1/24)
          |
          | ethernet1
          |
        FW (Firewall - RARE Router)
          |
          | ethernet2
          |
       CORE (Core Router - RARE)
          |
    +-----+-----+-----+-----+
    |     |     |     |     |
   PC1   PC2  SRV1  SRV2  KALI
```

**Network Segments:**
- **WAN**: 203.0.113.0/24 (ISP to Firewall)
- **Internal**: Connected via Core router
- **Users**: 10.0.10.0/24 (PC1, PC2)
- **Servers**: 10.0.20.0/24 (Server1, Server2)
- **DMZ/Test**: 10.0.30.0/24 (Kali)

**Key Features:**
- Multiple device types (Linux, RARE routers)
- ISP simulation with network address translation
- Firewall and core routing infrastructure
- User workstations
- Internal servers with persistent storage (binds)
- Penetration testing node (Kali)
- 7 nodes, 7 links
- Realistic network configuration

**Devices:**

1. **ISP** (nicolaka/netshoot)
   - Simulates internet connection
   - IP forwarding and NAT enabled
   - Routes 10.0.0.0/8 range

2. **FW** (RARE/FreeRTR)
   - Edge firewall/router
   - Connects WAN to internal network
   - Requires config directory

3. **CORE** (RARE/FreeRTR)
   - Internal network routing
   - Connects all internal devices
   - Requires config directory

4. **PC1, PC2** (Alpine)
   - End-user workstations
   - DHCP or static IP configuration
   - Can reach servers and outside network

5. **Server1, Server2** (Alpine)
   - Internal servers
   - Persistent storage binds
   - Protected behind firewall

6. **Kali** (Kali Linux)
   - Penetration testing/security tools
   - Internal attacker node simulation

**Use Case:** Full enterprise network testing, security demonstrations, advanced configuration testing

---

## Loading Templates

### In the Frontend Application

1. **File → Open Template**
2. Select template from list
3. Template loads into editor
4. Customize as needed
5. Save with new name

### Programmatically (TypeScript/JavaScript)

```typescript
// Load basic template
import basicTemplate from './basic-network.json';

// Load enterprise template
import enterpriseTemplate from './enterprise-dt.json';

// Use in topology editor
const topology = enterpriseTemplate;

// Customize
topology.name = "My Custom Network";
topology.nodes.push(newNode);
```

## Creating New Templates

When creating new template files:

1. Follow JSON schema validation
2. Use meaningful IDs (lowercase, hyphens)
3. Position nodes logically (related nodes nearby)
4. Use appropriate UI colors for device types
5. Include metadata (created date, version)
6. Document the topology in comments/README
7. Test YAML generation before saving

### Template Naming Convention
```
{purpose}-{scope}.json

Examples:
- basic-network.json
- enterprise-dt.json
- security-lab.json
- wan-simulation.json
- multi-tenant-dc.json
```

## Customization Examples

### Changing Network Addresses
```json
"properties": {
  "IP": "192.168.1.0/24",    // Change subnet
  "GW": "192.168.1.1",        // Change gateway
  "exec": [
    "ip addr add 192.168.1.10/24 dev eth1",
    "ip route add default via 192.168.1.1 dev eth1"
  ]
}
```

### Adding Volume Binds
```json
"binds": [
  "./config:/etc/app",
  "./data:/var/data",
  "./logs:/var/log"
]
```

### Modifying Startup Commands
```json
"exec": [
  "echo 'Custom startup'",
  "apk add --no-cache bird",  // Alpine package
  "/usr/sbin/bird -d"          // Start bird routing daemon
]
```

### Adding Environment Variables
```json
"env": {
  "LOG_LEVEL": "debug",
  "METRICS_PORT": "9090",
  "ENABLE_IPV6": "false"
}
```

## YAML Generation

When a topology is built, the frontend converts the JSON structure to containerlab YAML:

**From JSON:**
```json
{
  "name": "enterprise-dt",
  "nodes": [
    {
      "id": "fw",
      "kind": "rare",
      "image": "...",
      "properties": { ... }
    }
  ],
  "links": [
    {
      "source": { "deviceId": "fw", "interface": "ethernet1" },
      "target": { "deviceId": "core", "interface": "ethernet1" }
    }
  ]
}
```

**To YAML:**
```yaml
name: enterprise-dt
topology:
  nodes:
    fw:
      kind: rare
      image: ...
      env: ...
      binds: ...
    # ... more nodes
  links:
    - endpoints: ["fw:ethernet1", "core:ethernet1"]
    # ... more links
```

## Tips and Best Practices

1. **Logical Layout**: Position routers in center, edge devices around them
2. **Naming**: Use descriptive, concise names (FW, CORE, PC1, SERVER1)
3. **Subnetting**: Use /24 subnets for simplicity, /16 for larger networks
4. **Interfaces**: Track interface assignments to avoid conflicts
5. **Testing**: Start with basic topology, add complexity gradually
6. **Persistence**: Store templates in version control
7. **Documentation**: Keep topology diagrams and config notes together

