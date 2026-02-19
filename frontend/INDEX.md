# Frontend Structure - Complete Index

## Overview

The `/frontend` folder contains a complete specification and template structure for building the Inspector topology builder web application. This document serves as the master index for all frontend resources.

## File Structure

```
frontend/
├── README.md                    ← START HERE
├── STRUCTURE.md                 ← Detailed architecture documentation
├── IMPLEMENTATION_GUIDE.md      ← Developer implementation reference
├── API_INTEGRATION.md           ← Backend API specifications
├── topology-utils.ts            ← Core utility functions (TypeScript)
│
├── devices/                     ← Device/node templates
│   ├── template.json           ← Base template structure
│   ├── linux-alpine.json       ← Alpine Linux container
│   ├── linux-netshoot.json     ← Netshoot utility container
│   ├── linux-kali.json         ← Kali Linux penetration testing
│   └── router-rare.json        ← FreeRTR/RARE router
│
├── schemas/                     ← JSON Schema definitions
│   ├── SCHEMAS.md              ← Schema usage documentation
│   ├── node.schema.json        ← Single node/device schema
│   ├── link.schema.json        ← Link/connection schema
│   └── topology.schema.json    ← Complete topology schema
│
└── templates/                   ← Example topologies
    ├── EXAMPLES.md             ← Template documentation
    ├── basic-network.json      ← 2-node basic topology
    └── enterprise-dt.json      ← Full enterprise topology
```

## Quick Navigation

### For UI Developers
1. Start with [README.md](README.md) - Overview and quick start
2. Review [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Component structure
3. Check [topology-utils.ts](topology-utils.ts) - Helper functions
4. Reference [templates/EXAMPLES.md](templates/EXAMPLES.md) - Example data structures

### For Backend Developers
1. Read [API_INTEGRATION.md](API_INTEGRATION.md) - API specifications
2. Review [STRUCTURE.md](STRUCTURE.md) - Expected data flow
3. Check [schemas/SCHEMAS.md](schemas/SCHEMAS.md) - Validation requirements

### For Product/Design
1. Read [README.md](README.md) - Feature overview
2. Check [templates/EXAMPLES.md](templates/EXAMPLES.md) - Use cases
3. Review [STRUCTURE.md](STRUCTURE.md) - User workflows

### For System Architects
1. Study [STRUCTURE.md](STRUCTURE.md) - Complete architecture
2. Review [API_INTEGRATION.md](API_INTEGRATION.md) - System integration
3. Check [schemas/](schemas/) - Data contracts

---

## Document Descriptions

### README.md
**Purpose:** Main documentation for the frontend topology builder

**Covers:**
- Feature overview
- Directory structure
- Quick start guide
- Device types and configuration
- UI components overview
- Validation and YAML generation
- API integration summary
- Best practices
- Troubleshooting

**Read Time:** 15 minutes
**Audience:** Everyone

---

### STRUCTURE.md
**Purpose:** Detailed architectural documentation

**Covers:**
- Complete folder structure rationale
- Device template structure and properties
- Link template structure
- Topology representation
- YAML generation process
- Configuration properties by device type
- Frontend UI component requirements
- Data flow from UI to YAML
- Backend integration points
- Required API endpoints

**Read Time:** 20 minutes
**Audience:** Architects, senior developers

---

### IMPLEMENTATION_GUIDE.md
**Purpose:** Practical guide for implementing UI components

**Covers:**
- TypeScript/React component structure
- Data flow and state management
- Detailed component implementations:
  - Canvas (drag-drop)
  - Device Palette
  - Properties Panel
  - Link Editor
  - Build Controls
  - Progress Display
- Event flows (creation, linking, building)
- Redux store shape and actions
- Styling guidelines and CSS classes
- Form validation
- Testing examples
- Performance optimization
- Accessibility requirements

**Read Time:** 25 minutes
**Audience:** Frontend developers

---

### API_INTEGRATION.md
**Purpose:** Complete REST API specification

**Covers:**
- Base URL and endpoints
- Build topology endpoint (POST)
- Progress monitoring (Server-Sent Events)
- Status querying endpoint
- Container logs endpoint
- Stop/teardown endpoint
- Build history endpoints
- Error handling and codes
- Rate limiting
- Complete integration examples
- Workflow diagrams

**Read Time:** 20 minutes
**Audience:** Backend developers, frontend developers

---

### topology-utils.ts
**Purpose:** Core utility functions for topology operations

**Functions:**
- `topologyToYaml()` - Convert JSON to YAML
- `validateTopology()` - Validate structure
- `generateNodeId()` - Create unique IDs
- `generateLinkId()` - Create unique link IDs
- `createNodeFromTemplate()` - Instantiate from template
- `updateNode()` - Update with validation
- `exportTopologyJson()` - Save JSON
- `exportTopologyYaml()` - Save YAML
- `checkInterfaceDuplicates()` - Validate interfaces
- `getAvailableInterfaces()` - List free interfaces

**Read Time:** 5 minutes
**Audience:** Frontend/backend developers

---

### devices/template.json
**Purpose:** Base template structure for device definitions

**Contains:**
- All possible fields and their defaults
- UI presentation properties
- Configurable fields array
- Validation rules

**Usage:** Reference when creating new device templates

---

### devices/linux-alpine.json
**Purpose:** Alpine Linux device template

**Provides:**
- Kind: `linux`
- Image: `alpine`
- Example exec commands
- Example env variables
- IP/GW configuration
- UI properties (icon, color, category)

**Use Cases:** General-purpose containers, client nodes, simple services

---

### devices/linux-netshoot.json
**Purpose:** Netshoot network utility device template

**Provides:**
- Kind: `linux`
- Image: `nicolaka/netshoot:latest`
- IP forwarding configuration
- NAT/masquerade setup
- Network routing examples

**Use Cases:** ISP simulation, network diagnostics, edge routing

---

### devices/linux-kali.json
**Purpose:** Kali Linux penetration testing device template

**Provides:**
- Kind: `linux`
- Image: `kalilinux/kali-rolling`
- Network configuration
- IPv6 disabling
- Security tools setup

**Use Cases:** Penetration testing, security demonstrations, attack simulation

---

### devices/router-rare.json
**Purpose:** FreeRTR/RARE router device template

**Provides:**
- Kind: `rare`
- Image: `ghcr.io/rare-freertr/freertr-containerlab:latest`
- VRF initialization
- PCAP dataplane setup
- Configuration file binding

**Use Cases:** Enterprise routers, firewalls, complex routing

---

### schemas/node.schema.json
**Purpose:** JSON Schema validation for individual nodes

**Validates:**
- Required fields (id, name, kind, properties)
- Field formats and patterns
- IP address CIDR notation
- Enum values (kind, category)
- String lengths and character restrictions

**Usage:** Validate node objects before YAML generation

---

### schemas/link.schema.json
**Purpose:** JSON Schema validation for connections

**Validates:**
- Required fields (id, source, target)
- Endpoint structure (deviceId, interface)
- UI properties (style, width, color)

**Usage:** Validate link objects before YAML generation

---

### schemas/topology.schema.json
**Purpose:** JSON Schema validation for complete topologies

**Validates:**
- Required fields (name, nodes)
- Node array (minimum 1 node)
- Links array (optional)
- Metadata structure

**Usage:** Validate entire topology before submission

---

### schemas/SCHEMAS.md
**Purpose:** Documentation for all JSON schemas

**Covers:**
- Individual schema descriptions
- Property documentation
- Validation rules and patterns
- Validation usage examples
- Device categories
- Common IP patterns
- YAML generation mapping
- Best practices
- Error handling

**Read Time:** 15 minutes
**Audience:** Developers implementing validation

---

### templates/basic-network.json
**Purpose:** Simple example topology for learning

**Example Topology:**
```
PC1 (10.0.10.10/24) ←→ PC2 (10.0.10.11/24)
```

**Features:**
- 2 Alpine Linux containers
- Single Ethernet connection
- Same subnet addressing
- Minimal configuration

**Use:** Testing, learning, teaching basics

---

### templates/enterprise-dt.json
**Purpose:** Full enterprise topology (mirrors twin.yml)

**Example Topology:**
```
ISP (203.0.113.1/24)
  ↓
FW (RARE Router)
  ↓
CORE (RARE Router)
  ├─ PC1 (10.0.10.10/24)
  ├─ PC2 (10.0.10.11/24)
  ├─ Server1 (10.0.20.10/24)
  ├─ Server2 (10.0.20.11/24)
  └─ Kali (10.0.30.10/24)
```

**Features:**
- 8 nodes, 7 links
- Multiple device types
- Realistic network segmentation
- ISP simulation with NAT
- Persistent storage binds
- Complete security lab

**Use:** Enterprise demonstrations, advanced testing

---

### templates/EXAMPLES.md
**Purpose:** Documentation of example topologies

**Covers:**
- File descriptions
- Topology diagrams
- Network segments explanation
- Device descriptions
- Use cases and scenarios
- How to load templates
- Customization examples
- YAML generation details
- Best practices

**Read Time:** 10 minutes
**Audience:** Everyone

---

## Key Concepts

### Topology JSON Structure
```json
{
  "name": "Project Name",
  "nodes": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "kind": "linux|rare|docker",
      "image": "image:tag",
      "properties": {
        "exec": ["cmd1", "cmd2"],
        "env": { "VAR": "value" },
        "binds": ["/host:/container"],
        "IP": "10.0.0.0/24",
        "GW": "10.0.0.1"
      },
      "ui": {
        "icon": "icon-name",
        "color": "#hex",
        "category": "router|server|client|attacker|network",
        "position": { "x": 0, "y": 0 }
      }
    }
  ],
  "links": [
    {
      "source": { "deviceId": "id1", "interface": "eth1" },
      "target": { "deviceId": "id2", "interface": "eth1" },
      "ui": { "style": "solid", "width": 2 }
    }
  ]
}
```

### YAML Generation Flow
```
Topology JSON
    ↓
Validation (against schemas)
    ↓
Transform to YAML
    ↓
Submit to /api/topology/build
    ↓
Backend: containerlab execution
    ↓
Progress streaming via SSE
    ↓
Container status updates
```

### Build Lifecycle
```
Initial State: "Build" button enabled
    ↓
User clicks "Build"
    ↓
Validation → YAML Generation → API Submit
    ↓
"Build" button disabled, progress bar shown
    ↓
Real-time SSE updates
    ↓
On Success: "Build" disabled → "Status" + "Stop" enabled
On Failure: Error notification, "Build" re-enabled
```

---

## Development Workflow

### Phase 1: Planning
1. Review [README.md](README.md) for feature overview
2. Study [STRUCTURE.md](STRUCTURE.md) for architecture
3. Review example templates in [templates/](templates/)

### Phase 2: Design
1. Review [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
2. Design component hierarchy
3. Plan state management

### Phase 3: Development
1. Implement components using guide
2. Use [topology-utils.ts](topology-utils.ts) functions
3. Load device templates from [devices/](devices/)
4. Validate with [schemas/](schemas/)
5. Use example data from [templates/](templates/)

### Phase 4: Integration
1. Review [API_INTEGRATION.md](API_INTEGRATION.md)
2. Implement API communication
3. Handle SSE progress streams
4. Implement error handling

### Phase 5: Testing
1. Unit test validation functions
2. Integration test component flows
3. Test with example topologies
4. Test error scenarios

---

## Implementation Checklist

### Core Functionality
- [ ] Load device templates dynamically
- [ ] Drag-drop device placement on canvas
- [ ] Visual node representation
- [ ] Click to select/edit properties
- [ ] Dynamic property panel based on device type
- [ ] Link creation between devices
- [ ] Topology validation in real-time
- [ ] YAML generation
- [ ] Build button management

### Build & Deployment
- [ ] Submit topology via POST
- [ ] Receive buildId
- [ ] Open SSE stream
- [ ] Handle progress events
- [ ] Update progress bar
- [ ] Show container status
- [ ] Enable/disable control buttons
- [ ] Handle build errors

### Advanced Features
- [ ] Undo/redo support
- [ ] Save/load projects
- [ ] Topology templates
- [ ] Build history
- [ ] Container logs
- [ ] Network statistics
- [ ] Multi-user support

---

## File Dependencies

```
README.md
├── STRUCTURE.md
├── IMPLEMENTATION_GUIDE.md
├── API_INTEGRATION.md
├── topology-utils.ts
├── devices/
│   └── *.json (all device files)
├── schemas/
│   ├── SCHEMAS.md
│   └── *.schema.json
└── templates/
    ├── EXAMPLES.md
    └── *.json
```

### Runtime Dependencies
```
Frontend Application
├── topology-utils.ts (core functions)
├── devices/*.json (template loading)
├── schemas/*.schema.json (validation)
├── templates/*.json (example data)
└── API Endpoints (/api/topology/*)
    └── Backend Service
        └── containerlab CLI
```

---

## Questions & Support

### Q: Where do I start?
A: Read [README.md](README.md) first, then [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

### Q: How do I add a new device type?
A: Create JSON in [devices/](devices/) following [devices/template.json](devices/template.json)

### Q: What does the backend need?
A: See [API_INTEGRATION.md](API_INTEGRATION.md) for complete API spec

### Q: How do I validate topology?
A: Use functions in [topology-utils.ts](topology-utils.ts) or run against [schemas/](schemas/)

### Q: Where are examples?
A: See [templates/](templates/) - load [templates/enterprise-dt.json](templates/enterprise-dt.json) for full example

### Q: How is data structured?
A: Read [STRUCTURE.md](STRUCTURE.md) for complete data model

---

## Version History

- **v1.0** (2024) - Initial specification
  - 5 device templates
  - 3 JSON schemas
  - 2 example topologies
  - Complete API specification
  - Implementation guide
  - 8 documentation files

---

## Related Projects

- **Backend:** `apps/containerlab/` - Containerlab executor and CLI
- **Desktop:** `apps/desktop/` - Electron desktop application wrapper
- **Renderer:** `apps/renderer/` - Vite-based renderer process
- **Tests:** `tests/` - End-to-end testing

---

## Contributors

Specification created as complete frontend topology builder architecture.

---

**Last Updated:** 2024
**Status:** Complete specification - Ready for implementation
