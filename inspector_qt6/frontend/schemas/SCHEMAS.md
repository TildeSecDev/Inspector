# Frontend Schemas

This directory contains JSON Schema definitions for topology validation and type safety.

## Schemas

### `node.schema.json`
Defines the structure of individual devices/nodes in a topology.

**Key Properties:**
- `id` (required): Unique identifier
- `name` (required): Device name (alphanumeric, hyphens, underscores)
- `kind` (required): Node type (linux, rare, docker, bridge, host)
- `image`: Docker image reference
- `properties`: Configuration object
  - `exec`: Array of startup commands
  - `env`: Environment variables (object)
  - `binds`: Volume binds (array)
  - `IP`: IPv4 address in CIDR format
  - `GW`: Gateway IP address
- `ui`: UI properties (icon, color, category, position)
- `configurableFields`: Array of editable field names

**Validation Rules:**
- Name must be 1-63 characters
- Name matches pattern: `^[a-zA-Z0-9_-]+$`
- IP addresses must match CIDR pattern: `^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$`
- Gateway IP matches: `^([0-9]{1,3}\.){3}[0-9]{1,3}$`

### `link.schema.json`
Defines connections between nodes.

**Key Properties:**
- `id` (required): Unique identifier
- `source` (required): Source endpoint object
  - `deviceId`: ID of source device
  - `interface`: Interface name (eth0, eth1, ethernet1, etc.)
- `target` (required): Target endpoint object
  - `deviceId`: ID of target device
  - `interface`: Interface name
- `ui`: Optional UI properties (style, width, color)

**Interface Naming Conventions:**
- Linux nodes typically use: `eth0`, `eth1`, `eth2`, ...
- RARE routers typically use: `ethernet1`, `ethernet2`, ...
- Convention is followed by containerlab automatically

### `topology.schema.json`
Defines the complete topology structure.

**Key Properties:**
- `name` (required): Project/topology name
- `description`: Optional description
- `nodes` (required): Array of node objects (minimum 1)
- `links`: Array of link objects
- `metadata`: Optional metadata (created, modified, version)

## Validation Usage

### In TypeScript/JavaScript

```typescript
import Ajv from 'ajv';
import nodeSchema from './node.schema.json';
import topologySchema from './topology.schema.json';

const ajv = new Ajv();
const validateNode = ajv.compile(nodeSchema);
const validateTopology = ajv.compile(topologySchema);

// Validate a node
if (!validateNode(nodeData)) {
  console.error('Node validation errors:', validateNode.errors);
}

// Validate entire topology
if (!validateTopology(topologyData)) {
  console.error('Topology validation errors:', validateTopology.errors);
}
```

## Device Categories

Used for UI organization and filtering:
- **router**: Network routing devices (RARE, etc.)
- **server**: Server containers
- **client**: Client/workstation nodes
- **attacker**: Security testing/pentesting nodes
- **network**: Network utility containers (netshoot, etc.)

## Common IP Patterns

### Private Network Ranges
- `10.0.0.0/8` - Class A private
- `172.16.0.0/12` - Class B private
- `192.168.0.0/16` - Class C private

### Example Subnets
- Users/Clients: `10.0.10.0/24`
- Servers: `10.0.20.0/24`
- DMZ: `10.0.30.0/24`
- Management: `10.0.40.0/24`

## YAML Generation Mapping

When converting topology to containerlab YAML:

**Node Properties → YAML:**
```yaml
nodes:
  deviceName:
    kind: node.kind
    image: node.image
    exec: node.properties.exec  # array
    env: node.properties.env     # object
    binds: node.properties.binds # array
```

**Link Properties → YAML:**
```yaml
links:
  - endpoints:
      - "source_device:source_interface"
      - "target_device:target_interface"
```

## Validation Best Practices

1. **Schema Validation**: Always validate against schemas before YAML generation
2. **Cross-device Validation**: Ensure deviceIds in links exist in nodes array
3. **Interface Validation**: Track used interfaces to prevent duplicates
4. **Circular Dependency Check**: Prevent invalid network configurations
5. **Unique Naming**: Ensure all device names are unique within topology

## Error Handling

Common validation errors:

- **Invalid name format**: Name contains special characters or spaces
- **Duplicate links**: Same endpoints already connected
- **Missing interface**: Device doesn't have specified interface
- **Invalid CIDR**: IP address not in CIDR notation
- **Invalid IP**: IP address out of valid range
- **Missing required field**: A required property is missing

