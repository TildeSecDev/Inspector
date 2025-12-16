# Inspector Twin - Complete Implementation Roadmap

## 🔴 CRITICAL BLOCKERS (Must Fix First)

### 1. Fix better-sqlite3 Node.js Version Mismatch
**File:** Root package.json + Electron build config  
**Impact:** Application crashes on startup, entire backend inaccessible  
**Tasks:**
- [ ] Rebuild better-sqlite3 for Node.js 20.x (NODE_MODULE_VERSION 119)
  ```bash
  npm rebuild better-sqlite3 --build-from-source
  ```
- [ ] OR switch to `sql.js` or `sqlite3` (pure JS fallback) if rebuild fails
- [ ] Test Electron startup with fixed module
- [ ] Add preload bridge test to verify IPC channels

**Acceptance:** Electron main process starts without module errors

---

## 🏗️ PHASE 1: Backend Foundation (1-2 weeks)

### 2. Implement SQLite Database Layer
**Files:** `packages/project-store/src/`  
**Current Status:** Skeleton only, migrations.ts exists but not executed  

#### 2.1 Database Initialization
- [ ] Create `db.ts` - SQLite connection manager
  - Initialize database at user data directory
  - Run migrations on startup
  - Create connection pool
- [ ] Update `repositories.ts` - Implement all DAO classes:
  - [ ] `ProjectRepository` (CRUD: create, read, update, delete, getAll)
  - [ ] `TopologyRepository` (CRUD + graph validation)
  - [ ] `ScenarioRepository` (CRUD + scenario schema validation)
  - [ ] `RunRepository` (create, getById, getByScenarioId)
  - [ ] `FindingRepository` (create batch, getByRunId, deleteByRunId)
  - [ ] `ReportRepository` (create, getByRunId, delete)

#### 2.2 Database Migrations
- [ ] Create `migrations/001_init.sql`:
  ```sql
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE topologies (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    graph_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
  
  CREATE TABLE scenarios (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    topology_id TEXT NOT NULL,
    name TEXT NOT NULL,
    scenario_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (topology_id) REFERENCES topologies(id)
  );
  
  CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    results_json TEXT,
    status TEXT CHECK(status IN ('running', 'completed', 'failed')),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
  );
  
  CREATE TABLE findings (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
    title TEXT NOT NULL,
    description TEXT,
    evidence_json TEXT,
    remediation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  );
  
  CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    format TEXT CHECK(format IN ('json', 'pdf')),
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  );
  ```
- [ ] Update `migrations.ts` to execute migration files in order
- [ ] Add migration runner to Electron main process startup

#### 2.3 Zod Schema Validation
- [ ] Update `packages/shared/src/schemas.ts`:
  ```typescript
  // Existing + add:
  export const ProjectSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });
  
  export const TopologySchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    name: z.string(),
    graph: z.object({
      nodes: z.array(NodeSchema),
      links: z.array(LinkSchema),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
  });
  
  export const RunResultSchema = z.object({
    id: z.string().uuid(),
    scenarioId: z.string().uuid(),
    startedAt: z.date(),
    finishedAt: z.date(),
    status: z.enum(['running', 'completed', 'failed']),
    metrics: z.object({
      packetsProcessed: z.number(),
      packetsDropped: z.number(),
      policiesEvaluated: z.number(),
    }),
    events: z.array(EventSchema),
    findings: z.array(FindingSchema),
  });
  ```
- [ ] Validate all JSON blobs before save/load using `schema.parse()`

**Acceptance:** Database tables created, migrations run, repositories fully functional with CRUD operations

---

### 3. Implement Electron IPC Bridge
**Files:** `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`  
**Current Status:** main.ts exists, preload.ts likely incomplete  

#### 3.1 Preload Bridge
- [ ] Update `preload.ts` to expose API:
  ```typescript
  const { contextBridge, ipcRenderer } = require('electron');
  
  contextBridge.exposeInMainWorld('electronAPI', {
    project: {
      create: (data) => ipcRenderer.invoke('project:create', data),
      getAll: () => ipcRenderer.invoke('project:getAll'),
      update: (id, data) => ipcRenderer.invoke('project:update', id, data),
      delete: (id) => ipcRenderer.invoke('project:delete', id),
    },
    topology: {
      create: (data) => ipcRenderer.invoke('topology:create', data),
      update: (id, data) => ipcRenderer.invoke('topology:update', id, data),
      getByProjectId: (projectId) => ipcRenderer.invoke('topology:getByProjectId', projectId),
    },
    scenario: {
      create: (data) => ipcRenderer.invoke('scenario:create', data),
      getByProjectId: (projectId) => ipcRenderer.invoke('scenario:getByProjectId', projectId),
    },
    simulation: {
      run: (graph, scenario, options) => ipcRenderer.invoke('simulation:run', graph, scenario, options),
    },
    findings: {
      getByRunId: (runId) => ipcRenderer.invoke('findings:getByRunId', runId),
    },
    report: {
      generate: (data, options) => ipcRenderer.invoke('report:generate', data, options),
    },
    settings: {
      get: (key) => ipcRenderer.invoke('settings:get', key),
      set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    },
  });
  ```

#### 3.2 Main Process IPC Handlers
- [ ] Register IPC handlers in `main.ts`:
  ```typescript
  // Example handler pattern
  ipcMain.handle('project:create', async (event, data) => {
    try {
      const validated = ProjectSchema.parse(data);
      return await projectRepo.create(validated);
    } catch (error) {
      throw new Error(`Project creation failed: ${error.message}`);
    }
  });
  
  // Repeat for: project:getAll, project:update, project:delete
  // topology:create, topology:update, topology:getByProjectId
  // scenario:create, scenario:getByProjectId
  // simulation:run
  // findings:getByRunId
  // report:generate
  // settings:get, settings:set
  ```
- [ ] Add error handling with user-friendly messages
- [ ] Log IPC calls for debugging

#### 3.3 Context Isolation & Security
- [ ] Verify `contextIsolation: true` in BrowserWindow config
- [ ] Verify `nodeIntegration: false`
- [ ] Test IPC calls from renderer to main process

**Acceptance:** All IPC handlers functional, project CRUD operations work end-to-end

---

## 🎨 PHASE 2: UI Components & State Management (1 week)

### 4. Project Management
**File:** `apps/renderer/src/pages/ProjectsPage.tsx`  
**Current Status:** Create form exists, but no persistence

- [ ] Add error handling for failed API calls
- [ ] Add loading states during project creation
- [ ] Implement project selection (click to open)
- [ ] Add project deletion with confirmation
- [ ] Display project list cards with metadata (created date, description)
- [ ] Update Zustand store when project selected:
  ```typescript
  // In appStore.ts
  setCurrentProject: (project) => set({ currentProject: project }),
  ```
- [ ] Trigger page redirect to Twin Designer when project selected
- [ ] Add empty state illustration when no projects

**Acceptance:** User can create project → project persists → project selectable → navigates to designer

---

### 5. Twin Designer Canvas (React Flow)
**File:** `apps/renderer/src/pages/TwinDesignerPage.tsx`  
**Current Status:** Skeleton with node type dropdown, no canvas

#### 5.1 Canvas Rendering
- [ ] Verify React Flow is rendering (may just need to remove project check)
- [ ] Display empty canvas by default
- [ ] Implement node palette on left side:
  - [ ] Router (blue)
  - [ ] Switch (green)
  - [ ] Firewall (red)
  - [ ] Server (purple)
  - [ ] Workstation (gray)
  - [ ] Cloud Service (cyan)
  - [ ] Modem/ISP (orange)
  - [ ] Mobile (light gray)
  - [ ] IoT (brown)
  - [ ] Tactical Data Link (TDL) (navy)
  - [ ] Hacking Device (ESP32) (red with pattern)

#### 5.2 Node Interaction
- [ ] Drag nodes from palette to canvas
- [ ] Click node to open properties panel:
  - [ ] Name
  - [ ] Role/Type
  - [ ] OS
  - [ ] Versions
  - [ ] Tags
  - [ ] Risk Criticality (low/medium/high/critical)
  - [ ] IP/subnet assignment
- [ ] Delete nodes
- [ ] Duplicate nodes

#### 5.3 Link Interaction
- [ ] Connect nodes with edges (ethernet/wifi/wan/vpn/serial/tdl)
- [ ] Click link to edit properties:
  - [ ] Link type dropdown
  - [ ] Bandwidth (Mbps)
  - [ ] Latency (ms)
  - [ ] Loss (%)
  - [ ] Jitter (ms)
  - [ ] "Can fail" toggle
  - [ ] "Currently failed" toggle
- [ ] Delete links
- [ ] Link validation (prevent circular, validate protocol compatibility)

#### 5.4 Firewall Rules Editor
- [ ] For Firewall nodes, add DSL rule editor modal:
  ```
  allow tcp from Users to WebApp port 443
  deny any from Guests to Internal
  allow dns from Any to DNS
  ```
- [ ] Parse rules in real-time
- [ ] Show syntax errors

#### 5.5 Save/Export
- [ ] "Save" button → persist topology to DB via IPC
- [ ] "Validate" button → call core-sim validation API
- [ ] "Export" button → download JSON topology
- [ ] Auto-save on node/link changes (debounced)

#### 5.6 Load Existing Topology
- [ ] On page load, fetch topology by project ID
- [ ] Render existing nodes/links to canvas
- [ ] Preserve user's layout on reload

**Acceptance:** Can create network topology with nodes, links, properties, firewall rules; saves to DB

---

### 6. Scenarios Editor
**File:** `apps/renderer/src/pages/ScenariosPage.tsx`  
**Current Status:** Lists scenarios but page requires project (untested)

#### 6.1 Scenario List
- [ ] Load scenarios for selected project
- [ ] Display scenario cards:
  - [ ] Name
  - [ ] Description
  - [ ] Baseline traffic summary
  - [ ] Injected faults
  - [ ] Created date
  - [ ] Edit/delete buttons

#### 6.2 Create Scenario Modal
- [ ] Form fields:
  - [ ] Name (required)
  - [ ] Description
  - [ ] Topology selection (dropdown)
  - [ ] Scenario type template (buttons):
    - [ ] "Custom"
    - [ ] "ISP Link Failure"
    - [ ] "Guest Network Lateral Movement"
    - [ ] "Attacker on Network"
    - [ ] (Load seed templates from packages/shared/src/sample-data.ts)

#### 6.3 Baseline Traffic Definition
- [ ] Add traffic flows:
  - [ ] Source node
  - [ ] Destination node
  - [ ] Protocol (TCP/UDP/ICMP/DNS)
  - [ ] Port
  - [ ] Bandwidth (Mbps)
  - [ ] Duration (sec)
  - [ ] Label (for timeline)
- [ ] Visual flow overlay on canvas

#### 6.4 Injected Faults
- [ ] Add fault rules:
  - [ ] Type: "Link Down", "Link Degrade", "DNS Failure", "Service Down"
  - [ ] Target link/node
  - [ ] Start time (sec)
  - [ ] Duration (sec)
  - [ ] Severity
- [ ] Timeline visualization

#### 6.5 Attack/Event Scenarios (Predefined)
- [ ] "Credential Reuse Event":
  - [ ] Inject: Workstation → Internal server with high bandwidth
  - [ ] Policy should block (if configured)
- [ ] "Phishing Compromise":
  - [ ] Inject: Workstation → Attacker device (C2 channel)
  - [ ] Monitor for data exfil
- [ ] "Lateral Movement Attempt":
  - [ ] Inject: Compromised workstation → Admin server
  - [ ] Segmentation policy should block
- [ ] "Data Exfiltration":
  - [ ] Inject: Internal → External (cloud) transfer
  - [ ] DLP/proxy should detect

#### 6.6 Save Scenario
- [ ] Persist to DB via IPC
- [ ] Validate against topology (all nodes/links exist)
- [ ] Show validation errors

**Acceptance:** Can create baseline traffic + fault scenarios; templates available

---

### 7. Simulation Runner UI
**File:** `apps/renderer/src/pages/SimulationRunnerPage.tsx`  
**Current Status:** Skeleton, requires project selection

#### 7.1 Scenario Selection
- [ ] Dropdown: List all scenarios for current project
- [ ] Select button to run
- [ ] Display scenario preview (traffic + faults)

#### 7.2 Run Controls
- [ ] "Run Simulation" button
- [ ] Loading spinner while running
- [ ] Cancel button (if applicable)
- [ ] Simulation options:
  - [ ] Verbose logging (checkbox)
  - [ ] Timeout (seconds input)
  - [ ] Repeat count (for statistical results)

#### 7.3 Results Display
- [ ] **Metrics Panel:**
  - [ ] Packets Processed (count)
  - [ ] Packets Dropped (count)
  - [ ] Policies Evaluated (count)
  - [ ] Total Findings (count)
  - [ ] Reachability % by node pair
  - [ ] Avg Latency (ms)

- [ ] **Event Timeline:**
  - [ ] Scrollable list of events:
    ```
    [0ms] Traffic flow: Workstation-1 → Server (port 443)
    [100ms] Packet forwarded through Router-1
    [150ms] Policy evaluation: ALLOW (firewall rule #3)
    [200ms] Packet delivered to Server
    [5000ms] Link down: Router-1 → ISP (injected fault)
    [5100ms] Packet dropped: Unreachable destination
    ```
  - [ ] Color code by type (flow, forward, policy, drop, latency)
  - [ ] Click event to highlight related nodes/links

- [ ] **Reachability Matrix:**
  - [ ] Table: Source × Destination
  - [ ] Cell values: Reachable (✓), Blocked (✗), Degraded (~)
  - [ ] Sortable, filterable

#### 7.4 Findings Integration
- [ ] "View Findings" button → navigate to Findings page
- [ ] Findings pre-populated from simulation results

#### 7.5 Report Generation
- [ ] "Generate Report" dropdown:
  - [ ] JSON export
  - [ ] PDF export

**Acceptance:** Can run simulation, view timeline, metrics, reachability matrix

---

### 8. Findings Display
**File:** `apps/renderer/src/pages/FindingsPage.tsx`  
**Current Status:** Skeleton, fetches from backend

#### 8.1 Findings List
- [ ] Load findings from run (via IPC: `findings.getByRunId()`)
- [ ] Group by severity:
  - [ ] Critical (red) - 0 initially
  - [ ] High (orange) - 1-2 expected
  - [ ] Medium (yellow) - 1-2 expected
  - [ ] Low (blue)
  - [ ] Info (gray)
- [ ] Sort by severity or creation date

#### 8.2 Finding Details
- [ ] Display card for each finding:
  - [ ] Title
  - [ ] Severity badge
  - [ ] Description
  - [ ] Evidence (links to nodes/policies that triggered)
  - [ ] Remediation text (actionable steps)
  - [ ] Affected nodes/links highlighted

#### 8.3 Finding Types (Seed 3 Minimum)
1. **Policy Block Finding:**
   - Title: "Traffic denied by firewall rule"
   - Evidence: Which rule blocked, source/dest nodes
   - Remediation: "Review firewall rules or whitelist legitimate traffic"

2. **Single Point of Failure:**
   - Title: "Critical node has no redundancy"
   - Evidence: Core router/link failure prevents connectivity
   - Remediation: "Add redundant links or failover devices"

3. **Exposed Path Finding:**
   - Title: "Insecure protocol exposed to guest network"
   - Evidence: HTTP/Telnet/FTP from Guest → Internal
   - Remediation: "Enforce TLS/SSH or implement segmentation"

#### 8.4 Filtering & Export
- [ ] Filter by severity
- [ ] Search by title/description
- [ ] Export findings to CSV/JSON

**Acceptance:** Findings display with details, remediation, evidence links

---

## 🧮 PHASE 3: Simulation Engine (1-2 weeks)

### 9. Implement core-sim Integration
**Package:** `packages/core-sim/src/`  
**Current Status:** Skeleton exists (simulator.ts, validation.ts, blast-radius.ts)

#### 9.1 Type Definitions (in shared/src/schemas.ts or core-sim types)
- [ ] Complete `Node` type:
  ```typescript
  interface Node {
    id: string;
    type: 'router' | 'switch' | 'firewall' | 'server' | 'workstation' | 'cloud' | 'modem' | 'mobile' | 'iot' | 'tdl' | 'hacking-device';
    label: string;
    position: { x: number; y: number };
    os?: string;
    version?: string;
    tags: string[];
    riskCriticality: 'low' | 'medium' | 'high' | 'critical';
    interfaces: Interface[];
    policies?: Policy[]; // For firewall nodes
  }
  
  interface Interface {
    id: string;
    name: string;
    ip: string;
    subnet: string;
    enabled: boolean;
  }
  
  interface Policy {
    id: string;
    action: 'allow' | 'deny';
    protocol: string;
    sourceNodes: string[]; // Node IDs or tags
    destNodes: string[];
    port?: number;
  }
  ```

- [ ] Complete `Link` type:
  ```typescript
  interface Link {
    id: string;
    source: string; // Node ID
    target: string; // Node ID
    type: 'ethernet' | 'wifi' | 'wan' | 'vpn' | 'serial' | 'tdl';
    bandwidth: number; // Mbps
    latency: number; // ms
    loss: number; // %
    jitter: number; // ms
    canFail: boolean;
    failed: boolean;
  }
  ```

- [ ] Complete `Scenario` type:
  ```typescript
  interface Scenario {
    id: string;
    projectId: string;
    topologyId: string;
    name: string;
    description?: string;
    flows: Flow[];
    faults: Fault[];
    policies: Policy[];
  }
  
  interface Flow {
    id: string;
    from: string; // Node ID
    to: string;
    protocol: string;
    port?: number;
    rate: number; // Mbps or packets/sec
    label: string;
    startTime: number; // ms
    duration: number; // ms
  }
  
  interface Fault {
    id: string;
    type: 'link-down' | 'link-degrade' | 'dns-failure' | 'service-down';
    target: string; // Node or Link ID
    startTime: number; // ms
    duration: number; // ms
    severity: 'low' | 'medium' | 'high';
  }
  ```

#### 9.2 Graph Validation (simulator.ts)
- [ ] Implement `validateGraph(graph)`:
  - [ ] Check all node IDs unique
  - [ ] Check all link source/target exist
  - [ ] Check no circular references (if acyclic required)
  - [ ] Validate interface IPs (CIDR notation)
  - [ ] Validate policies reference existing nodes
  - [ ] Return array of `ValidationError` objects
  ```typescript
  interface ValidationError {
    level: 'error' | 'warning';
    message: string;
    nodeId?: string;
    linkId?: string;
  }
  ```

#### 9.3 Core Simulation Engine (simulator.ts)
- [ ] Implement `simulate(graph, scenario, options): RunResult`
  ```typescript
  interface RunResult {
    id: string;
    scenarioId: string;
    startedAt: Date;
    finishedAt: Date;
    status: 'completed' | 'failed';
    timeline: TimelineEvent[];
    metrics: SimulationMetrics;
    findings: Finding[];
  }
  
  interface TimelineEvent {
    timestamp: number; // ms
    type: 'flow-start' | 'packet-forward' | 'policy-eval' | 'packet-drop' | 'packet-deliver' | 'latency-spike' | 'link-down' | 'fault-inject';
    message: string;
    sourceNode?: string;
    destNode?: string;
    linkId?: string;
    policyId?: string;
    reason?: string;
  }
  
  interface SimulationMetrics {
    packetsProcessed: number;
    packetsDropped: number;
    policiesEvaluated: number;
    avgLatency: number; // ms
    reachabilityMatrix: Map<string, Map<string, 'reachable' | 'blocked' | 'degraded'>>;
  }
  ```

#### 9.4 Simulation Algorithm
- [ ] For each flow in scenario:
  - [ ] Find path from source to destination (BFS/Dijkstra, prefer shortest)
  - [ ] Simulate packet journey:
    - [ ] Timeline: "Flow start"
    - [ ] For each hop (node → link → node):
      - [ ] Check link status (failed, degraded, latency)
      - [ ] Evaluate firewall policies at each firewall node
      - [ ] If allowed: forward, accumulate latency, add timeline event
      - [ ] If denied: drop packet, add finding, timeline event
      - [ ] If link failed: packet drops, timeline event
    - [ ] Timeline: "Packet delivered" or "Packet dropped"
  - [ ] Inject faults at specified times
  - [ ] Recalculate reachability for each fault state

#### 9.5 Policy Evaluation (policy-dsl integration)
- [ ] Link to `packages/policy-dsl/src/policy.ts`
- [ ] For each firewall node in path:
  - [ ] Get policies for that node
  - [ ] Match flow against policies (in order, first match wins)
  - [ ] Return allow/deny decision
  - [ ] Timeline: "Policy evaluation: [RULE] → [DECISION]"

#### 9.6 Blast Radius Calculation (blast-radius.ts)
- [ ] Implement `computeBlastRadius(graph, compromisedNodeId)`:
  ```typescript
  interface BlastRadiusResult {
    compromisedNode: string;
    directlyReachable: string[]; // Nodes this can directly reach
    indirectlyReachable: string[]; // Nodes reachable through multiple hops
    impactedServices: string[]; // Critical services now exposed
    recommendedMitigation: string[];
  }
  ```
- [ ] Starting from compromised node, BFS to find all reachable nodes
- [ ] Check which are critical (riskCriticality = critical/high)
- [ ] Return findings

#### 9.7 Tests
- [ ] Write unit tests in `core-sim/src/simulator.test.ts`:
  - [ ] Test valid/invalid graphs
  - [ ] Test simple 2-node flow
  - [ ] Test multi-hop routing
  - [ ] Test policy blocks
  - [ ] Test link failures
  - [ ] Test blast radius
- [ ] Write integration test in `core-sim/test/simulator.sample.test.ts`:
  - [ ] Full "SME Office + Cloud App" scenario from seed data

**Acceptance:** Simulation runs, produces timeline, metrics, reachability matrix, findings

---

### 10. Implement policy-dsl Parser & Evaluator
**Package:** `packages/policy-dsl/src/`  
**Current Status:** Skeleton (policy.ts exists)

#### 10.1 DSL Grammar
- [ ] Define grammar for firewall rules:
  ```
  RULE := ACTION SOURCE TO DEST [PORT] [PROTOCOL]
  ACTION := "allow" | "deny"
  SOURCE := NODES | TAGS | "Any"
  DEST := NODES | TAGS | "Any"
  NODES := NodeID ("," NodeID)*
  TAGS := "#" TagName ("," "#" TagName)*
  PORT := "port" NUMBER
  PROTOCOL := "tcp" | "udp" | "icmp" | "dns" | "http" | "https" | "ssh"
  
  Examples:
  allow tcp from Users to WebApp port 443
  deny any from Guests to #internal
  allow dns from Any to DNS
  ```

#### 10.2 Parser (using regex or pegjs)
- [ ] Implement `parsePolicy(ruleText)`:
  ```typescript
  interface ParsedRule {
    action: 'allow' | 'deny';
    protocol: string;
    sourceNodes: string[];
    sourceTagsstring[];
    destNodes: string[];
    destTags: string[];
    port?: number;
  }
  ```
- [ ] Error handling for malformed rules
- [ ] Support comments (# syntax)

#### 10.3 Validator
- [ ] Implement `validatePolicy(policy, graph)`:
  - [ ] Check all referenced nodes exist
  - [ ] Check all tags exist (at least one node has each tag)
  - [ ] Check port is valid (1-65535)
  - [ ] Return validation errors
- [ ] Check for policy conflicts/redundancy

#### 10.4 Evaluator
- [ ] Implement `evaluatePolicy(flow, policies): Decision`:
  ```typescript
  interface Decision {
    action: 'allow' | 'deny';
    matchedRule: ParsedRule;
    reason: string;
  }
  ```
- [ ] Test flow against policies in order
- [ ] Return first match
- [ ] Default: deny if no match

#### 10.5 Compiler (Optional, for Performance)
- [ ] Compile policy list to decision tree or BPF bytecode
- [ ] Used during simulation for speed

#### 10.6 Tests
- [ ] Write tests in `policy-dsl/src/policy.test.ts`:
  - [ ] Parse valid rules
  - [ ] Reject invalid rules
  - [ ] Validate against graph
  - [ ] Evaluate flows correctly
  - [ ] Test order-dependent rules

**Acceptance:** Can define, parse, validate, evaluate firewall policies

---

## 📄 PHASE 4: Reporting (1 week)

### 11. Implement Report Generation
**Package:** `packages/report-kit/src/`  
**Current Status:** Skeleton (report-generator.ts exists)

#### 11.1 Report Data Structure
- [ ] Implement `generateReport(runResult, scenario, graph, options)`:
  ```typescript
  interface ReportData {
    title: string;
    projectName: string;
    scenarioName: string;
    topologyName: string;
    generatedAt: Date;
    
    // Architecture summary
    architecture: {
      nodeCount: number;
      linkCount: number;
      criticalNodes: string[];
      nodeList: Array<{ id: string; type: string; criticality: string }>;
      linkList: Array<{ id: string; source: string; target: string; bandwidth: number; latency: number }>;
    };
    
    // Simulation results
    simulation: {
      duration: number; // ms
      packetsProcessed: number;
      packetsDropped: number;
      dropRate: number; // %
      avgLatency: number;
      reachabilityMatrix: any; // 2D array
    };
    
    // Findings
    findings: Finding[];
    
    // Executive summary
    summary: {
      overallRisk: 'critical' | 'high' | 'medium' | 'low';
      totalFindings: number;
      criticalFindings: number;
      highFindings: number;
      topRecommendations: string[];
    };
  }
  ```

#### 11.2 JSON Export
- [ ] Implement `exportJSON(reportData): string`:
  - [ ] Serialize ReportData to pretty JSON
  - [ ] Include full event timeline
  - [ ] Include raw metrics
  - [ ] Validate against JSON schema

#### 11.3 PDF Export
- [ ] Use `pdf-lib` or Playwright `page.pdf()`:
  - [ ] Title page (project, scenario, date)
  - [ ] Executive summary
  - [ ] Architecture diagram (SVG render of topology)
  - [ ] Metrics table (packets, latency, reachability %)
  - [ ] Findings section:
    - [ ] One page per finding (title, severity, evidence, remediation)
  - [ ] Reachability matrix heatmap
  - [ ] Footer: Page numbers, report date
- [ ] Test PDF generation (headless Chromium)

#### 11.4 Integration with IPC
- [ ] Handler in main.ts:
  ```typescript
  ipcMain.handle('report:generate', async (event, data, options) => {
    const reportData = await generateReport(data);
    if (options.format === 'json') {
      return exportJSON(reportData);
    } else if (options.format === 'pdf') {
      return await exportPDF(reportData, options.outputPath);
    }
  });
  ```
- [ ] Save report to user's Downloads or temp directory
- [ ] Return file path to renderer
- [ ] Open report file after generation (optional)

#### 11.5 Tests
- [ ] Test JSON export (valid JSON schema)
- [ ] Test PDF generation (file exists, readable)
- [ ] Test with various data sizes

**Acceptance:** Can generate JSON + PDF reports with full content

---

## 🌱 PHASE 5: Seed Data & Sample Scenarios (3-4 days)

### 12. Implement Sample Data & Scenarios
**File:** `packages/shared/src/sample-data.ts`  
**Current Status:** Skeleton exists

#### 12.1 "SME Office + Cloud App" Project
- [ ] Topology:
  - [ ] Nodes: ISP Modem → Office Router → Internal Switch → [Workstations, File Server, DB Server, Cloud VPN Gateway]
  - [ ] Cloud: VPN Gateway → Cloud App Server → Cloud Database
  - [ ] Assign IPs, criticality levels
  - [ ] Firewall rules: Only office→cloud on port 443, workstation→DB only from file server

- [ ] Scenarios:
  1. **ISP Link Failure:**
     - Inject: Link down between Modem and Router at T=5000ms
     - Expected: Cannot reach cloud apps
     - Findings: Single point of failure, no WAN redundancy
  
  2. **Guest Network Lateral Movement Blocked:**
     - Flow: Guest Workstation → File Server (should be blocked)
     - Injected: Guest tries to reach internal file server
     - Expected: Policy blocks, finding shows segmentation working
  
  3. **Attacker on Network:**
     - Compromised: Workstation (high blast radius potential)
     - Can reach: File Server, DB (if no policies)
     - Finding: Lateral movement possible, weak segmentation

#### 12.2 "School Lab + Guest Wi-Fi Segmentation" Project
- [ ] Topology:
  - [ ] Nodes: Core Router → Lab Switch, Guest AP, Admin Switch
  - [ ] Lab Switch → [Lab Workstations, Lab Servers (web, db)]
  - [ ] Guest AP → [Student Devices]
  - [ ] Admin Switch → [Admin Workstations, Directory Server]
  - [ ] IPs/subnets: 10.0.1.0/24 (lab), 10.0.2.0/24 (guest), 10.0.3.0/24 (admin)
  - [ ] Firewall: Guest ↔ Lab/Admin blocked, Lab→Servers allowed, Admin→All allowed

- [ ] Scenarios:
  1. **ISP Link Failure:**
     - Same as SME but for school (no external access)
  
  2. **Guest Tries to Access Lab:**
     - Flow: Guest Device → Lab Server (should block)
     - Finding: Segmentation working, compliance (FERPA) protected
  
  3. **Attacker on Guest Network:**
     - Compromised: Student Device
     - Can reach: Other guests (if no AP isolation)
     - Cannot reach: Lab, Admin (if firewall rules work)

#### 12.3 Seed Data Generator
- [ ] Implement `seedSampleProjects()` function:
  ```typescript
  async function seedSampleProjects() {
    if (await projectRepo.getAll().length > 0) return; // Don't overwrite
    
    await projectRepo.create({
      id: uuid(),
      name: "SME Office + Cloud App",
      description: "...",
    });
    // ... create topology, scenarios
    
    await projectRepo.create({
      id: uuid(),
      name: "School Lab + Guest Wi-Fi Segmentation",
      description: "...",
    });
  }
  ```
- [ ] Call in Electron main process after migrations:
  ```typescript
  await runMigrations();
  await seedSampleProjects();
  ```

#### 12.4 Tests
- [ ] Verify both projects created on fresh install
- [ ] Run simulations for each scenario
- [ ] Verify expected findings generated
- [ ] Export reports for sample scenarios

**Acceptance:** Both sample projects available in UI, all scenarios runnable, generate findings

---

## 🧪 PHASE 6: Testing & Quality Assurance (1 week)

### 13. Unit Tests
**Files:** `packages/core-sim/**/*.test.ts`, `packages/policy-dsl/**/*.test.ts`  
**Current Status:** Test files exist but skipped

- [ ] Vitest configuration working
- [ ] Run all unit tests:
  ```bash
  npm run test
  ```
- [ ] Achieve >80% code coverage for:
  - [ ] core-sim (simulator, validation, blast-radius)
  - [ ] policy-dsl (parser, validator, evaluator)
  - [ ] project-store (repositories)
- [ ] Fix all failing tests
- [ ] Document test commands in README

### 14. Integration Tests
**File:** `packages/shared/test/integration.test.ts`  
**Current Status:** Skeleton

- [ ] Test end-to-end workflows:
  - [ ] Create project → Create topology → Create scenario → Run simulation → Generate findings → Export report
  - [ ] Load existing project → Modify topology → Re-simulate → Verify findings updated
  - [ ] Test all sample scenarios

### 15. UI/E2E Tests (Playwright)
**File:** `tests/smoke.playwright.ts`  
**Current Status:** Exists but not comprehensive

- [ ] Expand test coverage:
  - [ ] ROE modal acceptance
  - [ ] Project creation and persistence
  - [ ] Topology creation (add nodes, links, properties)
  - [ ] Scenario creation and selection
  - [ ] Run simulation and view results
  - [ ] View findings page
  - [ ] Generate JSON/PDF reports
  - [ ] Settings page functions
- [ ] Run tests:
  ```bash
  npm run test:ui
  ```
- [ ] All tests pass before shipping

### 16. Error Handling & Edge Cases
- [ ] Handle invalid inputs (XSS, injection)
- [ ] Handle missing data gracefully
- [ ] Handle IPC failures with user messages
- [ ] Handle database errors with recovery
- [ ] Test with large topologies (100+ nodes)
- [ ] Test with long-running simulations (timeout handling)

**Acceptance:** All tests pass, >80% coverage, no unhandled errors

---

## 🔒 PHASE 7: Security Hardening (4-5 days)

### 17. Electron Security
- [ ] Verify security config:
  - [ ] `contextIsolation: true`
  - [ ] `nodeIntegration: false`
  - [ ] `sandbox: true` (if applicable)
  - [ ] CSP headers in preload
  - [ ] No `eval()` or `Function()`
- [ ] Validate IPC message sources
- [ ] Sanitize all user inputs before DB/file operations
- [ ] Disable developer tools in production

### 18. Local-Only Enforcement
- [ ] Verify Docker/Podman targets only localhost
- [ ] Block any non-localhost connections in lab-runtime
- [ ] Log all requests for audit trail
- [ ] Settings page shows enforced constraints

### 19. Data Privacy
- [ ] Store SQLite in user's secure location (e.g., ~/.config/inspector-twin/)
- [ ] No telemetry or external calls
- [ ] No cloud dependencies
- [ ] Encrypt sensitive fields (if applicable)

**Acceptance:** Security audit pass, no external calls detected, localhost-only enforced

---

## 📦 PHASE 8: Packaging & Distribution (4-5 days)

### 20. Electron Builder Configuration
**File:** `apps/desktop/package.json` (build config)

- [ ] Configure `electron-builder`:
  ```json
  {
    "build": {
      "appId": "com.inspectortwin.app",
      "productName": "Inspector Twin",
      "files": ["src/**", "dist/**", "node_modules/**"],
      "mac": {
        "category": "public.app-category.utilities",
        "target": ["dmg", "zip"]
      },
      "win": {
        "target": ["nsis", "portable"]
      },
      "linux": {
        "target": ["AppImage", "deb"]
      }
    }
  }
  ```
- [ ] Sign binaries (Mac, Windows)
- [ ] Test installers on all platforms

### 21. Build Commands
- [ ] Update `run_dev.sh` to work on all platforms
- [ ] Create `run_dev.bat` for Windows
- [ ] npm script: `npm run build`
  - [ ] Builds TypeScript
  - [ ] Bundles with Vite
  - [ ] Packages with electron-builder
- [ ] npm script: `npm run dist`
  - [ ] Produces installers

### 22. Release Notes
- [ ] Document v0.1.0 features and limitations
- [ ] Installation instructions for Mac/Windows/Linux
- [ ] Known issues section

**Acceptance:** Installers created, tested on all platforms

---

## 📚 PHASE 9: Documentation (3-4 days)

### 23. Update README.md
- [ ] Project description
- [ ] Features overview
- [ ] Installation (all platforms)
- [ ] Quick start guide
- [ ] Usage examples (create topology, run scenario)
- [ ] Architecture overview
- [ ] Technology stack
- [ ] Contributing guidelines
- [ ] License

### 24. API Documentation
- [ ] JSDoc comments for all public functions
- [ ] IPC API documentation (preload.ts)
- [ ] Database schema documentation
- [ ] Type definitions exported and documented

### 25. User Guide
- [ ] How to create a project
- [ ] How to design topology
- [ ] How to write firewall rules
- [ ] How to create scenarios
- [ ] How to run simulations
- [ ] How to interpret findings
- [ ] How to generate reports
- [ ] Screenshots/GIFs for each step

**Acceptance:** README + API docs complete, user guide written

---

## ⚡ Summary by Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | 1-2w | SQLite DB, IPC bridge, repositories |
| **Phase 2** | 1w | Project mgmt, Twin Designer, Scenarios, Simulation UI, Findings UI |
| **Phase 3** | 1-2w | core-sim engine, policy-dsl parser, routing, blast radius |
| **Phase 4** | 1w | Report generation (JSON + PDF) |
| **Phase 5** | 3-4d | Sample projects & scenarios, seed data |
| **Phase 6** | 1w | Unit tests, integration tests, UI tests, coverage |
| **Phase 7** | 4-5d | Security hardening, local-only enforcement |
| **Phase 8** | 4-5d | Electron Builder, packaging, installers |
| **Phase 9** | 3-4d | Documentation, user guide |
| **TOTAL** | ~6-8 weeks | **Full MVP v0.1** |

---

## Acceptance Criteria (Definition of Done)

### ✅ Functional
- [ ] User can create project and persist to DB
- [ ] User can design topology with nodes, links, properties
- [ ] User can define scenarios with baseline traffic + faults
- [ ] User can run simulations and see timeline + metrics + reachability
- [ ] User can view findings (minimum 3 types)
- [ ] User can generate JSON + PDF reports
- [ ] ROE modal gates all features until accepted
- [ ] App runs offline with no cloud dependencies

### ✅ Safety
- [ ] No network operations against external IPs by default
- [ ] Docker/Podman targets only localhost/127.0.0.1/192.168.x.x
- [ ] Settings enforce localhost-only constraints
- [ ] No external attack tooling, exploit payloads, bruteforce
- [ ] Simulation-only (no real hacking), lab-only checks

### ✅ Quality
- [ ] Unit tests for core-sim, policy-dsl (>80% coverage)
- [ ] Integration tests for full workflow
- [ ] Playwright UI tests for all major features
- [ ] All tests pass
- [ ] No unhandled errors, proper error messages
- [ ] Works on Mac, Windows, Linux

### ✅ Documentation
- [ ] README with installation, quick start, usage
- [ ] API documentation
- [ ] User guide with screenshots
- [ ] Architecture overview

---

## Notes

- **Dependency Management:** Ensure all workspaces dependencies resolve correctly. Test `npm install` at root.
- **Type Safety:** Use strict TypeScript. No `any` except when necessary (with comments).
- **Error Handling:** Every IPC call should have try/catch with user-friendly messages.
- **Performance:** Optimize simulation for topologies with 100+ nodes. Consider lazy evaluation for large results.
- **Accessibility:** Basic a11y (alt text, ARIA labels, keyboard navigation).
- **Data Validation:** Zod schemas for all inputs, especially JSON payloads from renderer.
