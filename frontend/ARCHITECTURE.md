# Frontend Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UI Layer (React Components)             │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │  │
│  │  │   Canvas     │  │  Properties  │  │  Device  │   │  │
│  │  │  (Drag/Drop) │  │    Panel     │  │ Palette  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Link Editor  │  │ Build Status │                 │  │
│  │  └──────────────┘  └──────────────┘                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         State Management (Redux/Context)             │  │
│  │                                                       │  │
│  │  ├─ topology (nodes, links)                          │  │
│  │  ├─ ui (selection, dragging)                         │  │
│  │  ├─ build (status, progress)                         │  │
│  │  └─ validation (errors)                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Core Layer (TypeScript Utils)              │  │
│  │                                                       │  │
│  │  ├─ topology-utils.ts                               │  │
│  │  │  ├─ topologyToYaml()                             │  │
│  │  │  ├─ validateTopology()                           │  │
│  │  │  ├─ generateNodeId()                             │  │
│  │  │  └─ generateLinkId()                             │  │
│  │  ├─ Validation functions                            │  │
│  │  ├─ YAML generation                                 │  │
│  │  └─ Device management                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Resource Layer (JSON Files)                  │  │
│  │                                                       │  │
│  │  ├─ devices/ (device templates)                     │  │
│  │  ├─ schemas/ (validation schemas)                   │  │
│  │  └─ templates/ (example topologies)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓↑
                    REST API / SSE
                           ↓↑
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Layer (/api/topology)                 │  │
│  │                                                       │  │
│  │  POST   /build          (Submit YAML)               │  │
│  │  GET    /{id}/progress  (SSE stream)                │  │
│  │  GET    /{id}/status    (Container status)          │  │
│  │  GET    /{id}/logs      (Container logs)            │  │
│  │  POST   /{id}/stop      (Teardown)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Containerlab Executor                           │  │
│  │   (apps/containerlab)                               │  │
│  │                                                       │  │
│  │  ├─ YAML parsing                                     │  │
│  │  ├─ Node creation                                    │  │
│  │  ├─ Link configuration                               │  │
│  │  ├─ Container orchestration                          │  │
│  │  └─ Progress tracking                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Container Runtime (Docker/Containerlab)        │  │
│  │                                                       │  │
│  │  ├─ Container creation                               │  │
│  │  ├─ Network configuration                            │  │
│  │  ├─ Volume management                                │  │
│  │  └─ Service orchestration                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### Topology Definition Flow

```
Device Template        Node Creation         Updated State
   (JSON)                (UI Action)          (Store)
     │                       │                   │
     ├─ id            ┌──────┼──────┐           │
     ├─ name          │      │      │           │
     ├─ kind          ▼      ▼      ▼           │
     ├─ image      Palette Drop  Device ID  Dispatch
     ├─ properties                Generator  addNode
     └─ ui              │              │        ▼
                        └──────┬───────┘    Redux
                               │           Store
                            Canvas      ┌──────────┐
                           Rendered     │ Updated  │
                                        │ Nodes[]  │
                                        └──────────┘
```

### Link Creation Flow

```
User Interaction       Link Creation       Validation         Addition
  (Click)              (UI State)          (Engine)           (Store)

Start Connect ┐
              ├─ Connection Mode = true
              │
Select Source ┼─ sourceNode = pc1
              │  sourceInterface = eth1
              │
Select Target ├─ targetNode = pc2
              │  targetInterface = eth1
              │
              ▼
         Link Object  ─┬─ Validate endpoints exist
                       ├─ Check interfaces available
                       ├─ Verify no circular deps
                       │
                       ▼
                  Valid? Yes
                       │
                       ▼
                  generateLinkId()
                       │
                       ▼
                  Dispatch addLink()
                       │
                       ▼
                  Redux: links[] updated
                       │
                       ▼
                  Canvas re-rendered
```

### YAML Generation & Build Flow

```
Build Trigger          Validation         Transformation        Submission
                       
User clicks            Validate           Convert              POST /build
  "Build"              topology JSON      to YAML
     │                    │                  │                    │
     ▼                    ▼                  ▼                    ▼
validateTopology()    Required fields   topologyToYaml()   API Request
                      Node IDs unique      │                   │
Check:                Required props       ├─ name:            ├─ buildId
├─ Nodes exist             │               ├─ nodes:           ├─ status
├─ Links valid          Links valid        ├─ kinds:           ├─ timestamp
├─ No duplicates        Interfaces         ├─ exec:            
└─ User feedback        valid              └─ links:
      │                    │                  │
   Valid?              Valid?            YAML String
      │                    │                  │
      ▼                    ▼                  ▼
    No Errors          No Errors         API Ready
   Enable Build        Proceed           Submit
```

### Build Execution & Progress Flow

```
Build Submitted    Backend Processing    Progress Streaming    Status Updates
         │                 │                      │                  │
    buildId="123"    Initialize           SSE EventSource      Monitor
         │           containers                │                  │
         ├─────────────────►                 "init" event        │
         │              Create nodes       progress: 0%         │
         │─────────────────►                │                   │
         │            Configure links    "node-create"         │
         │─────────────────►                │                  ▼
         │              Network setup    progress: 25%      updateNode
         │─────────────────►                │              Status
         │                 │           "node-create"
         │                 │              ...           
         │                 │           "node-create"      
         │                 │         progress: 100%        
         │                 │                │                
         │                 │           "complete"           
         │                 │         containers: [...]      
         │                 ▼              │                
         │             DONE          eventSource.close()    
         │                 │              │
         ▼                 ▼              ▼
  Store buildId      Containers    Enable Status
  Start SSE stream   Running       Enable Stop
```

---

## Component Communication

```
┌─────────────────────────────────────────────────────────────┐
│                     Redux State Tree                        │
│                                                              │
│  root                                                        │
│  ├─ topology                                                │
│  │  ├─ name: string                                       │
│  │  ├─ nodes: Node[]                                      │
│  │  ├─ links: Link[]                                      │
│  │  └─ metadata: {}                                       │
│  │                                                          │
│  ├─ ui                                                      │
│  │  ├─ selectedNodeId: string?                            │
│  │  ├─ selectedLinkId: string?                            │
│  │  ├─ isDragging: boolean                                │
│  │  ├─ connectMode: boolean                               │
│  │  └─ connectSource: Endpoint?                           │
│  │                                                          │
│  ├─ build                                                   │
│  │  ├─ buildId: string?                                   │
│  │  ├─ status: 'idle' | 'building' | 'success'           │
│  │  ├─ progress: 0-100                                    │
│  │  ├─ containers: Container[]                            │
│  │  └─ error: string?                                     │
│  │                                                          │
│  └─ validation                                              │
│     ├─ errors: ValidationError[]                           │
│     └─ isValid: boolean                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↑↓
┌─────────────────────────────────────────────────────────────┐
│                  Component Actions                          │
│                                                              │
│  Canvas            ──► selectNode(id)                      │
│                    ──► moveNode(id, x, y)                  │
│                    ──► startDrag(id)                       │
│                    ──► stopDrag()                          │
│                                                              │
│  Palette           ──► createNode(template)                │
│                    ──► addNode(node)                       │
│                                                              │
│  Properties Panel  ──► updateNode(id, updates)             │
│                                                              │
│  Link Editor       ──► startConnect()                      │
│                    ──► endConnect(target)                  │
│                    ──► addLink(link)                       │
│                    ──► deleteLink(id)                      │
│                                                              │
│  Build Controls    ──► submitBuild(topology)               │
│                    ──► updateProgress(percent)             │
│                    ──► completeBuild(buildId)              │
│                    ──► submitStop(buildId)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Template Loading Architecture

```
Runtime Initialization
         │
         ▼
   App Component
    mounts
         │
         ├─────────────────┬──────────────────┬─────────────────┐
         │                 │                  │                 │
         ▼                 ▼                  ▼                 ▼
   Load Devices      Load Schemas      Load Templates      Load Utils
         │                 │                  │                 │
         ├─ alpine        ├─ node.schema   ├─ basic         └─ topology-utils.ts
         ├─ netshoot      ├─ link.schema   └─ enterprise
         ├─ kali          └─ topology.schema
         └─ router
         │                 │                  │
         └────────────┬────┴──────────────┬───┘
                      │                  │
                      ▼                  ▼
              Validate schemas      Populate Dev Palette
                      │                  │
                      └────────┬─────────┘
                               │
                               ▼
                         Frontend Ready
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
         Load Example Widget       Accept User Input
              (optional)                  │
                                     Build Topology
```

---

## Validation Pipeline

```
User Input
    │
    ▼
Node/Link Creation
    │
    ├─────────────────────────────────────────┐
    │                                         │
    ▼                                         ▼
Frontend Validation              Backend Validation
                                  (on build only)
├─ Required fields              ├─ YAML syntax
├─ Name format                  ├─ Containerlab compat
├─ IP addresses (CIDR)         ├─ Image availability
├─ Unique IDs                  ├─ Network conflicts
├─ Link endpoints              ├─ Resource checks
├─ No duplicate interfaces     └─ Config validation
├─ No circular deps
└─ Device existence
    │
    ▼
Valid Topology?
    │
    ├─ No ──► Show Errors
    │         (Build disabled)
    │
    └─ Yes ──► Build Enabled
               │
               ▼
          User clicks "Build"
               │
               ▼
          Generate YAML
               │
               ▼
          Submit to API
               │
               ▼
          Backend Validation
               │
               ├─ No ──► Error Response
               │
               └─ Yes ──► Execute containerlab
```

---

## Error Handling Flow

```
Error Occurs
    │
    ├─ Frontend Error (Validation/UI)
    │  │
    │  ├─ Schema Validation Error
    │  │  └─ Display inline error
    │  │
    │  ├─ Topology Validation Error
    │  │  └─ Display error list, disable build
    │  │
    │  └─ User Input Error
    │     └─ Show field-specific error
    │
    └─ Backend Error (Build/Execution)
       │
       ├─ Build Failed
       │  │
       │  ├─ YAML Syntax ──► Show YAML error
       │  │
       │  ├─ Image Missing ──► Suggest pull
       │  │
       │  ├─ Execution ──► Show node/phase error
       │  │
       │  └─ Timeout ──► Retry option
       │
       └─ Runtime Error
          │
          ├─ Container Crash ──► Show logs
          │
          └─ Network Issue ──► Reconnect SSE
               │
               ▼
          User Action
          ├─ View Details
          ├─ Check Logs
          ├─ Retry Build
          └─ Reset
```

---

## File Dependency Graph

```
README.md (entry point)
    │
    ├─► STRUCTURE.md
    │    └─► Device/Link/Topology specs
    │
    ├─► IMPLEMENTATION_GUIDE.md
    │    └─► Component specs
    │
    ├─► API_INTEGRATION.md
    │    └─► API specs, endpoints
    │
    ├─► topology-utils.ts
    │    ├─ Uses: schemas/*
    │    └─ Creates: YAML output
    │
    ├─► devices/**
    │    ├─ Referenced by: Palette component
    │    └─ Validated by: node.schema.json
    │
    ├─► schemas/**
    │    ├─ Usage: topology-utils validation
    │    └─ Doc: SCHEMAS.md
    │
    └─► templates/**
        ├─ Load option: "Open Template"
        └─ Doc: EXAMPLES.md
```

---

## Build State Machine

```
                  ┌──────────┐
                  │  IDLE    │
                  └──────────┘
                       │
                       │ Build clicked
                       │ (valid topology)
                       ▼
                  ┌──────────┐
    ┌─────────────│ QUEUED   │
    │             └──────────┘
    │                  │
    │                  │ Start execution
    │                  ▼
    │             ┌──────────┐
    │ Cancel ────│ BUILDING │◄────┐
    │ Build      └──────────┘     │
    │                  │          │
    │                  ├─ Progress updates
    │                  │
    │                  ├─ Node creation
    │                  │
    │                  ├─ Link configuration
    │                  │
    │                  ▼
    │             Complete
    │                  │
    │          ┌───────┴───────┐
    │          │               │
    │          ▼               ▼
    │    ┌──────────┐    ┌──────────┐
    │    │ SUCCESS  │    │ FAILED   │
    │    └──────────┘    └──────────┘
    │          │               │
    │          │ Stop    Show Error │
    │          │ Clicked    │       │
    │          │            ▼       │
    │          │        ┌──────────┐│
    │          │        │ STOPPING ││
    │          │        └──────────┘│
    │          │                   │
    └──────────┼───────────────────┘
               │
               ▼
          ┌──────────┐
          │ STOPPED  │
          └──────────┘
```

---

## Folder Structure Hierarchy

```
frontend/ (8 files, 3 folders)
│
├── 📄 Documentation (5 files)
│  ├── README.md ..................... Main documentation
│  ├── STRUCTURE.md .................. Architecture details
│  ├── IMPLEMENTATION_GUIDE.md ........ Component development
│  ├── API_INTEGRATION.md ............ Backend API spec
│  └── INDEX.md ...................... This index
│
├── 💾 Core Implementation (1 file)
│  └── topology-utils.ts ............. Core utilities
│
├── 🎨 Device Templates (5 files)
│  ├── devices/
│  │  ├── template.json .............. Base template
│  │  ├── linux-alpine.json .......... Alpine Linux
│  │  ├── linux-netshoot.json ........ Netshoot
│  │  ├── linux-kali.json ............ Kali Linux
│  │  └── router-rare.json ........... FreeRTR router
│
├── ✓ Validation Schemas (4 files)
│  ├── schemas/
│  │  ├── SCHEMAS.md ................. Schema documentation
│  │  ├── node.schema.json ........... Node validation
│  │  ├── link.schema.json ........... Link validation
│  │  └── topology.schema.json ....... Topology validation
│
└── 📋 Example Topologies (3 files)
   ├── templates/
   │  ├── EXAMPLES.md ................ Template documentation
   │  ├── basic-network.json ......... Simple 2-node
   │  └── enterprise-dt.json ......... Full enterprise
```

---

## Interaction Sequence Diagram

```
User              Frontend           Redux            API           Backend
 │                    │              Store           Service        (containerlab)
 │                    │               │               │                 │
 │ Drag device        │               │               │                 │
 ├───────────────────►│               │               │                 │
 │ (from palette)     │ dispatch      │               │                 │
 │                    │ addNode()     │               │                 │
 │                    ├──────────────►│               │                 │
 │                    │               │ render        │                 │
 │                    │◄──────────────┤ canvas        │                 │
 │                    │               │               │                 │
 │ Set properties     │               │               │                 │
 ├───────────────────►│               │               │                 │
 │                    │ dispatch      │               │                 │
 │                    │ updateNode()  │               │                 │
 │                    ├──────────────►│               │                 │
 │                    │               │               │                 │
 │ Connect links      │               │               │                 │
 ├───────────────────►│               │               │                 │
 │                    │ dispatch      │               │                 │
 │                    │ addLink()     │               │                 │
 │                    ├──────────────►│               │                 │
 │                    │               │               │                 │
 │ Click Build        │               │               │                 │
 ├───────────────────►│ validate()    │               │                 │
 │                    │ toYaml()      │               │                 │
 │                    ├──────────────────────────────►│ POST /build    │
 │                    │               │               ├────────────────►│
 │                    │               │               │◄────────────────┤
 │                    │               │               │                 │start
 │                    │               │ dispatch      │                 │containers
 │                    │               │ startBuild()  │                 │
 │                    │◄──────────────┤               │                 │
 │ (progress)         │ SSE: init     │               │◄────────────────┤
 │◄──────────────────────────────────────────────────────── "init"     │
 │                    │ progress: 0%  │               │                 │
 │                    │               │               │                 │
 │ (waiting)          │ SSE: node-create             │ create pc1      │
 │                    │ progress: 25% │               │                 │
 │◄── node-create: pc1──────────────────────────────────────────────────┤
 │                    │               │               │                 │
 │ (waiting)          │ SSE: progress │               │ create pc2      │
 │◄── node-create:pc2────────────────────────────────────────────────────┤
 │                    │ progress: 100%│               │                 │
 │                    │               │               │                 │
 │ (waiting)          │ SSE: complete │               │ done            │
 │◄── complete ───────────────────────────────────────────────────────────┤
 │                    │               │ dispatch      │                 │
 │                    │               │ completeBuild │                 │
 │                    │◄──────────────┤               │                 │
 │ Enable Status      │ render: Status│               │                 │
 │ Enable Stop        │ & Stop btns   │               │                 │
 │                    │               │               │                 │
```

---

This architecture ensures:
- **Separation of concerns** - UI, state, core logic, resources
- **Testability** - Each layer can be tested independently
- **Scalability** - Easy to add new device types, features
- **Maintainability** - Clear data flow and documentation
- **Extensibility** - Plugin-ready structure for future features
