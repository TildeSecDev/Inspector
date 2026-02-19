# Frontend Topology Builder Structure

## Overview
The frontend enables visual topology building with drag-and-drop device placement, configuration management, link creation, and YAML generation for containerlab execution.

## Folder Structure

### `/devices`
Contains JSON templates for each configurable device/node type.

```
devices/
├── linux-alpine.json         # Alpine Linux nodes
├── linux-netshoot.json       # Netshoot (network utilities)
├── linux-kali.json           # Kali Linux penetration testing
├── router-rare.json          # FreeRTR routers
└── template.json             # Base template structure
```

### `/schemas`
JSON Schema definitions for validation and type safety.

```
schemas/
├── node.schema.json          # Node/device schema
├── link.schema.json          # Link/endpoint schema
├── topology.schema.json      # Complete topology schema
└── SCHEMAS.md               # Schema documentation
```

### `/templates`
Example/starter topologies.

```
templates/
├── basic-network.json        # Simple 2-node setup
├── enterprise-dt.json        # Full enterprise topology
└── EXAMPLES.md              # Template documentation
```

## Device Template Structure

Each device template (`devices/*.json`) follows this format:

```json
{
  "id": "unique-device-id",
  "name": "Device Name",
  "kind": "linux|rare|docker|etc",
  "image": "image:tag",
  "properties": {
    "exec": ["command1", "command2"],
    "env": { "VAR": "value" },
    "binds": ["/src:/dest"],
    "IP": "10.0.0.1/24",
    "GW": "10.0.0.1"
  },
  "ui": {
    "icon": "icon-name",
    "color": "#hex",
    "category": "router|server|client|attacker",
    "defaultPosition": { "x": 0, "y": 0 }
  },
  "configurableFields": [
    "name",
    "image",
    "exec",
    "env",
    "binds",
    "IP",
    "GW"
  ]
}
```

## Link Template Structure

Links connect device endpoints:

```json
{
  "id": "link-id",
  "source": {
    "deviceId": "device1-id",
    "interface": "eth0|ethernet1"
  },
  "target": {
    "deviceId": "device2-id",
    "interface": "eth1|ethernet2"
  },
  "ui": {
    "style": "solid|dashed",
    "width": 2
  }
}
```

## Topology Structure

The complete topology representation in frontend (before YAML generation):

```json
{
  "name": "Topology Name",
  "description": "Topology description",
  "nodes": [
    {
      "id": "node1",
      "kind": "linux",
      "image": "alpine",
      "name": "PC1",
      "properties": { ... },
      "ui": { ... }
    }
  ],
  "links": [
    {
      "id": "link1",
      "source": { "deviceId": "node1", "interface": "eth1" },
      "target": { "deviceId": "node2", "interface": "eth1" }
    }
  ]
}
```

## YAML Generation Process

When "Build" button is clicked:

1. **Validation**: Validate topology structure against schema
2. **Transformation**: Convert frontend topology JSON → containerlab YAML
3. **Generation**: Create `.yml` file named `{projectName}.yml`
4. **Format**: Match twin.yml structure exactly:
   ```yaml
   name: Project Name
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

## Configuration Properties by Device Type

### Linux Nodes (Alpine, Netshoot, Kali)

**Configurable fields:**
- `name` - Device name
- `image` - Docker image (e.g., alpine, nicolaka/netshoot:latest)
- `exec` - List of commands to execute on startup
- `env` - Environment variables (key-value pairs)
- `IP` - IP address with CIDR (10.0.0.1/24)
- `GW` - Default gateway
- `binds` - Volume binds (array of /src:/dest)

**Example:**
```json
{
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

### Router Nodes (FreeRTR/RARE)

**Configurable fields:**
- `name` - Device name
- `image` - Always freertr image
- `env` - Environment variables:
  - `DATAPLANE_TYPE`: "pcapInt"
  - `INIT_VRF`: "true"
- `binds` - Config file binds (./configs/{name}:/config)

**Example:**
```json
{
  "name": "FW",
  "kind": "rare",
  "image": "ghcr.io/rare-freertr/freertr-containerlab:latest",
  "properties": {
    "env": {
      "DATAPLANE_TYPE": "pcapInt",
      "INIT_VRF": "true"
    },
    "binds": ["./configs/fw:/config"]
  }
}
```

## Frontend UI Components

### Device Palette
- Draggable device templates
- Organized by category (routers, servers, clients, attackers)
- Visual icons and colors

### Canvas
- Drag-and-drop placement
- Visual nodes with labels
- Line connections between devices
- Right-click context menus

### Properties Panel
- Dynamic fields based on selected device type
- Real-time validation
- Array editors (exec, binds, env)
- IP/GW input helpers

### Link Editor
- Click-to-connect mode
- Endpoint selector
- Interface naming
- Link visualization

### Build Controls
- **Build button**: Active when topology is valid
  - Converts to YAML
  - Triggers containerlab execution
  - Shows progress bar
- **Status button**: Shows container status (post-build)
- **Stop button**: Stops running topology (post-build)

## Data Flow

1. **User builds topology** → Frontend JSON representation
2. **User clicks "Build"** → Validate & Transform to YAML
3. **YAML sent to backend** → API endpoint
4. **Backend executes containerlab** → Progress streaming
5. **WebSocket/SSE** → Progress bar updates
6. **On success** → Enable "Status" & "Stop" buttons
7. **Status button** → Query container status
8. **Stop button** → Tear down topology and cleanup

## Integration with Backend

### Required API Endpoints

```
POST /api/topology/build
  Body: { yamlContent, projectName }
  Response: { buildId, status }

GET /api/topology/{buildId}/progress
  Response: EventStream (for progress updates)

GET /api/topology/{buildId}/status
  Response: { status, containers[], timings }

POST /api/topology/{buildId}/stop
  Response: { success, message }
```

## Notes

- All device properties must match containerlab expectations
- Interface naming follows containerlab conventions (eth0, eth1, ethernet1, etc.)
- Volume binds must be relative to containerlab context
- Validation should occur before YAML generation
- Store topology JSON for undo/redo functionality
