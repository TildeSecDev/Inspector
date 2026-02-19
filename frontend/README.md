# Inspector Frontend - Topology Builder

Interactive visual topology builder for containerlab network topologies. Build, deploy, and manage containerized network simulations through an intuitive drag-and-drop interface.

## Overview

The Inspector frontend is a web-based topology designer that allows you to:

- **Drag & drop** devices from a palette onto a canvas
- **Configure** each device with properties (image, IP, gateway, volumes, startup commands)
- **Connect** devices with visual links and configure endpoints
- **Validate** topology structure in real-time
- **Generate** containerlab YAML files
- **Deploy** topologies to containerlab with one click
- **Monitor** build progress with real-time updates
- **Manage** running topologies (status, logs, stop)

## Directory Structure

```
frontend/
├── README.md                    # This file
├── STRUCTURE.md                 # Detailed structure documentation
├── API_INTEGRATION.md           # Backend API specifications
├── topology-utils.ts            # Utility functions for topology operations
├── devices/                     # Device/node templates
│   ├── template.json           # Base template structure
│   ├── linux-alpine.json       # Alpine Linux servers
│   ├── linux-netshoot.json     # Network utility containers
│   ├── linux-kali.json         # Pentest/security testing
│   └── router-rare.json        # FreeRTR routers
├── schemas/                     # JSON Schema validation
│   ├── SCHEMAS.md              # Schema documentation
│   ├── node.schema.json        # Node definition schema
│   ├── link.schema.json        # Link/connection schema
│   └── topology.schema.json    # Full topology schema
└── templates/                   # Example topologies
    ├── EXAMPLES.md             # Template documentation
    ├── basic-network.json      # Simple 2-node setup
    └── enterprise-dt.json      # Full enterprise topology
```

## Quick Start

### 1. Load Device Templates

The frontend loads device templates from `devices/` folder. Each template defines:

- **Device type** (kind, image)
- **Default configuration** (exec commands, environment variables, binds)
- **UI properties** (icon, color, category, position)
- **Configurable fields** (which properties users can edit)

```json
{
  "id": "linux-alpine",
  "name": "Alpine Linux",
  "kind": "linux",
  "image": "alpine",
  "properties": { ... },
  "ui": { ... },
  "configurableFields": [...]
}
```

### 2. Create Topology

**Option A: Start from template**
- File → Open Template
- Select `basic-network.json` or `enterprise-dt.json`
- Customize as needed

**Option B: Build from scratch**
- Drag devices from palette onto canvas
- Click to select and edit properties
- Click and drag to create connections

### 3. Configure Devices

Each device type has specific configurable properties:

**Linux Nodes:**
- name, image, exec (array), env (object), IP (CIDR), GW, binds

**RARE Routers:**
- name, image, env (DATAPLANE_TYPE, INIT_VRF), binds (config path)

**Example Node Configuration:**
```json
{
  "id": "pc1",
  "name": "PC1",
  "kind": "linux",
  "image": "alpine",
  "properties": {
    "exec": [
      "ip addr add 10.0.10.10/24 dev eth1",
      "ip route add default via 10.0.10.1 dev eth1"
    ],
    "env": {
      "IP": "10.0.10.10/24",
      "GW": "10.0.10.1"
    },
    "binds": []
  }
}
```

### 4. Create Connections

- Click on source device node
- Select interface (eth1, ethernet1, etc.)
- Click on target device
- Select interface
- Link is created with visual representation

**Link Properties:**
```json
{
  "source": { "deviceId": "pc1", "interface": "eth1" },
  "target": { "deviceId": "fw", "interface": "ethernet2" }
}
```

### 5. Validate & Build

- Click **"Build"** button (enabled only if topology is valid)
- Frontend validates:
  - Required fields present
  - Device IDs unique
  - Links reference valid devices
  - No duplicate interfaces
- Converts topology to YAML
- Sends to backend for containerlab execution

### 6. Monitor Progress

- Progress bar shows build phases
- Real-time container status updates
- Error notifications with details
- On success: "Build" → "Status" + "Stop" buttons

### 7. Manage Topology

**Status Button:**
- Shows container status
- IP addresses and port mappings
- Container health

**Stop Button:**
- Gracefully stops all containers
- Removes networks and volumes
- Cleans up resources

## Device Types

### Linux Containers

#### Alpine Linux
- **Image:** `alpine`
- **Use:** General-purpose nodes, clients, lightweight services
- **Config:** IP, gateway, startup commands, volumes
- **Example:** User workstations, test servers

#### Netshoot
- **Image:** `nicolaka/netshoot:latest`
- **Use:** Network utilities, diagnostics, ISP simulation
- **Config:** IP routing, NAT, forwarding
- **Example:** Internet edge, network tools

#### Kali Linux
- **Image:** `kalilinux/kali-rolling`
- **Use:** Penetration testing, security demonstrations
- **Config:** Full penetration testing toolset
- **Example:** Attacker simulation, security testing

### Router Containers

#### FreeRTR (RARE)
- **Image:** `ghcr.io/rare-freertr/freertr-containerlab:latest`
- **Use:** Enterprise routing, VRF, complex networks
- **Config:** VRF setup, interface configuration, routing
- **Example:** Firewalls, core routers, edge routers

## Network Configuration

### IP Addressing

Use RFC 1918 private ranges:
- Class A: `10.0.0.0/8` (use `10.0.x.0/24` for subnets)
- Class B: `172.16.0.0/12`
- Class C: `192.168.0.0/16`

### Common Subnet Patterns

```
Users/Clients:    10.0.10.0/24
Servers:          10.0.20.0/24
DMZ/Testing:      10.0.30.0/24
Management:       10.0.40.0/24
External/ISP:     203.0.113.0/24
```

### Interface Naming

- **Linux nodes:** eth0, eth1, eth2, ... (based on connection order)
- **RARE routers:** ethernet1, ethernet2, ethernet3, ...
- **Convention:** Automatically followed by containerlab

## YAML Generation

When "Build" is clicked:

1. **Validate** topology against schema
2. **Transform** JSON to containerlab YAML format
3. **Submit** to backend API
4. Backend receives:
   ```yaml
   name: Topology Name
   topology:
     nodes:
       device1:
         kind: linux
         image: alpine
         exec: [...]
         env: {...}
         binds: [...]
     links:
       - endpoints: ["device1:eth1", "device2:eth1"]
   ```

## API Integration

The frontend communicates with the backend via REST API:

**Build Topology:**
```
POST /api/topology/build
{
  projectName: "topology-name",
  yamlContent: "YAML content",
  description: "Optional description"
}
→ { buildId, status, message }
```

**Monitor Progress (SSE):**
```
GET /api/topology/{buildId}/progress
→ Server-Sent Events stream with real-time updates
```

**Get Status:**
```
GET /api/topology/{buildId}/status
→ { status, progress, containers[], networks[], logs[] }
```

**Stop Topology:**
```
POST /api/topology/{buildId}/stop
→ { status, stoppedContainers[], message }
```

See [API_INTEGRATION.md](API_INTEGRATION.md) for detailed API specs.

## Validation

### Schema Validation

All topologies are validated against JSON schemas:

- `node.schema.json` - Individual device definitions
- `link.schema.json` - Connection definitions
- `topology.schema.json` - Complete topology structure

### Frontend Validation

Real-time validation checks:
- Required fields filled
- Unique node IDs
- Valid IP addresses (CIDR format)
- No duplicate interfaces on same device
- Links reference existing devices
- Valid interface names

### Backend Validation

Additional server-side validation:
- YAML syntax
- Containerlab compatibility
- Image availability
- Network address conflicts
- Resource availability

## Examples

### Basic 2-Node Network

Load `templates/basic-network.json`:
- PC1 (Alpine) ↔ PC2 (Alpine)
- Same subnet (10.0.10.0/24)
- Direct connectivity test

### Enterprise Dual-Tier Network

Load `templates/enterprise-dt.json`:
- ISP (Netshoot) → FW (RARE) → CORE (RARE)
- Users: PC1, PC2
- Servers: Server1, Server2
- Attacker: Kali
- Full realistic network topology

## Utility Functions

The `topology-utils.ts` module provides helper functions:

```typescript
// Convert topology to YAML
topologyToYaml(topology) → string

// Validate topology structure
validateTopology(topology) → { valid, errors[] }

// Generate unique IDs
generateNodeId(name, existingIds) → string
generateLinkId(sourceId, targetId, existingIds) → string

// Create node from template
createNodeFromTemplate(template, existingIds) → node

// Update node preserving structure
updateNode(node, updates) → node

// Export topology
exportTopologyJson(topology, filename)
exportTopologyYaml(topology, filename)

// Check interface conflicts
checkInterfaceDuplicates(topology) → { hasDuplicates, duplicates[] }

// Get available interfaces
getAvailableInterfaces(topology, nodeId, node) → string[]
```

## UI Components

### Device Palette
- Organized by category (routers, servers, clients, attackers)
- Drag-to-canvas placement
- Visual icons and colors

### Canvas
- Visual node representation
- Drag to move, double-click to edit
- Click endpoints to create connections
- Context menu for copy/delete

### Properties Panel
- Dynamic fields based on device type
- Array editors (exec, binds, env)
- IP/GW validation
- Real-time validation feedback

### Build Controls
- **Build button** - Active when topology valid
- **Progress bar** - Shows build phases
- **Status button** - Shows container status (post-build)
- **Stop button** - Stops topology (post-build)

## Data Storage

### Local Storage
```javascript
// Save to browser localStorage
localStorage.setItem('topology-draft', JSON.stringify(topology));

// Restore
const topology = JSON.parse(localStorage.getItem('topology-draft'));
```

### Export/Import
- **Export JSON** - Full topology data
- **Export YAML** - Ready for containerlab
- **Import** - Load topology files

## Best Practices

1. **Start Simple** - Begin with 2-3 nodes before building complex topologies
2. **Use Templates** - Load enterprise template and customize
3. **Validate Often** - Check validation errors before building
4. **Document** - Add description to topology
5. **Test** - Verify connectivity after building
6. **Save Regularly** - Export JSON for backup
7. **Monitor** - Check container logs for startup issues

## Troubleshooting

### Build Fails
- Check YAML syntax in error message
- Verify image names are correct
- Check network/image availability
- Review container logs in status view

### Containers Won't Connect
- Verify IP addresses are in same subnet
- Check interface names match
- Ensure gateway routes are correct
- Review startup commands

### Device Configuration Issues
- Check required fields are filled
- Verify CIDR notation for IPs
- Ensure bind paths are valid
- Review exec commands for syntax

## Related Documentation

- [STRUCTURE.md](STRUCTURE.md) - Detailed structure documentation
- [API_INTEGRATION.md](API_INTEGRATION.md) - Backend API specifications
- [schemas/SCHEMAS.md](schemas/SCHEMAS.md) - JSON Schema documentation
- [templates/EXAMPLES.md](templates/EXAMPLES.md) - Template examples

## Integration with Backend

Frontend expects these services from `apps/containerlab`:
- Containerlab CLI integration
- YAML execution
- Container lifecycle management
- Progress streaming
- Log collection

Backend provides REST API at `/api/topology/**` endpoints.

## Future Enhancements

- [ ] Undo/redo support
- [ ] Topology history/versioning
- [ ] Advanced routing configuration UI
- [ ] Network simulation parameters
- [ ] Real-time network statistics
- [ ] Container shell access
- [ ] Traffic capture/analysis
- [ ] Multi-user collaboration
- [ ] Topology sharing/marketplace
- [ ] Custom device type creation

