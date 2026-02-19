# Frontend-Backend API Integration

This document defines the API endpoints and data contracts required for the topology builder frontend to communicate with the backend containerlab executor.

## API Base URL

```
/api/topology
```

## Endpoints

### 1. Build Topology

**Endpoint:** `POST /api/topology/build`

**Purpose:** Submit a topology for building with containerlab

**Request:**
```typescript
{
  projectName: string;        // e.g., "Denterprise-dt"
  yamlContent: string;        // Full YAML content
  description?: string;       // Optional topology description
  metadata?: {
    author?: string;
    tags?: string[];
  };
}
```

**Response:**
```typescript
{
  buildId: string;            // Unique build identifier
  status: "queued" | "initializing";
  message: string;
  estimatedTime?: number;     // Estimated seconds to completion
  timestamp: ISO8601;
}
```

**Status Codes:**
- `202 Accepted` - Build queued successfully
- `400 Bad Request` - Invalid YAML or topology
- `413 Payload Too Large` - Topology too large
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/topology/build \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Denterprise-dt",
    "yamlContent": "name: Denterprise-dt\ntopology:\n  nodes:\n    ...",
    "description": "Enterprise network topology"
  }'
```

---

### 2. Get Build Progress (SSE)

**Endpoint:** `GET /api/topology/{buildId}/progress`

**Purpose:** Stream real-time build progress updates

**Response Type:** Server-Sent Events (text/event-stream)

**Events:**
```typescript
// Initialization phase
event: init
data: {
  phase: "init",
  message: "Initializing containerlab",
  timestamp: ISO8601
}

// Node creation phase
event: node-create
data: {
  phase: "node-create",
  nodeId: string;
  nodeName: string;
  status: "starting" | "running" | "ready";
  message: string;
  progress: number;           // 0-100
  timestamp: ISO8601
}

// Link creation phase
event: link-create
data: {
  phase: "link-create",
  linkId: string;
  source: string;
  target: string;
  status: "connecting" | "connected";
  progress: number;           // 0-100
  timestamp: ISO8601
}

// Completion phase
event: complete
data: {
  phase: "complete",
  status: "success" | "failed" | "cancelled",
  totalTime: number;          // milliseconds
  containers: {
    id: string;
    name: string;
    status: string;
    image: string;
    ipAddress: string;
  }[];
  summary: string;
  timestamp: ISO8601
}

// Error events
event: error
data: {
  phase: string;
  error: string;
  debug?: string;
  timestamp: ISO8601
}
```

**Connection Details:**
- Persistent connection, stays open until build completes
- Automatic reconnection with exponential backoff
- Timeout: 60 seconds of no events triggers reconnection

**Example Client (JavaScript):**
```javascript
const eventSource = new EventSource(`/api/topology/${buildId}/progress`);

eventSource.addEventListener('init', (event) => {
  const data = JSON.parse(event.data);
  console.log('Build started:', data.message);
  updateProgressBar(0);
});

eventSource.addEventListener('node-create', (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.nodeName}: ${data.status}`);
  updateProgressBar(data.progress);
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  if (data.status === 'success') {
    console.log('Build successful!', data.containers);
    enableStatusButton();
    enableStopButton();
  }
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Build error:', data.error);
  showErrorNotification(data.error);
  eventSource.close();
});
```

---

### 3. Get Build Status

**Endpoint:** `GET /api/topology/{buildId}/status`

**Purpose:** Get current status of a specific build

**Response:**
```typescript
{
  buildId: string;
  buildName: string;
  status: "queued" | "building" | "success" | "failed" | "cancelled";
  progress: number;           // 0-100
  startTime: ISO8601;
  endTime?: ISO8601;
  duration?: number;          // milliseconds
  containers: {
    id: string;
    name: string;
    image: string;
    status: "created" | "running" | "paused" | "stopped";
    ipAddresses: string[];
    ports: {
      containerPort: number;
      protocol: "tcp" | "udp";
      hostPort?: number;
    }[];
    healthStatus?: "healthy" | "unhealthy" | "none";
  }[];
  networks: {
    name: string;
    driver: string;
    subnets: string[];
  }[];
  errors?: {
    phase: string;
    message: string;
    node?: string;
    timestamp: ISO8601;
  }[];
  logs?: {
    node: string;
    lastLines: string[];
  }[];
  yamlPath?: string;          // Path to stored YAML file
}
```

**Status Codes:**
- `200 OK` - Status retrieved
- `404 Not Found` - Build ID doesn't exist
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl http://localhost:3000/api/topology/abc-123-def/status
```

---

### 4. Get Container Logs

**Endpoint:** `GET /api/topology/{buildId}/logs/{containerId}`

**Purpose:** Get execution logs from a specific container

**Query Parameters:**
```
?tail=50          // Number of lines (default: 50)
?follow=false     // Stream logs if true
```

**Response:**
```typescript
{
  containerId: string;
  containerName: string;
  logs: string;
  timestamp: ISO8601;
}
```

**Example:**
```bash
curl "http://localhost:3000/api/topology/abc-123-def/logs/pc1?tail=100"
```

---

### 5. Stop/Teardown Topology

**Endpoint:** `POST /api/topology/{buildId}/stop`

**Purpose:** Stop all containers and cleanup resources

**Request:**
```typescript
{
  force?: boolean;            // Force kill vs graceful shutdown
  cleanup?: boolean;          // Remove containers and networks (default: true)
}
```

**Response:**
```typescript
{
  buildId: string;
  status: "stopped" | "stopping";
  stoppedContainers: string[];
  removedNetworks: string[];
  message: string;
  timestamp: ISO8601;
}
```

**Status Codes:**
- `200 OK` - Stop signal sent
- `202 Accepted` - Graceful shutdown in progress
- `404 Not Found` - Build ID doesn't exist
- `409 Conflict` - Already stopped
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/topology/abc-123-def/stop \
  -H "Content-Type: application/json" \
  -d '{"force": false, "cleanup": true}'
```

---

### 6. List Active Builds

**Endpoint:** `GET /api/topology/builds/active`

**Purpose:** Get list of currently active builds

**Query Parameters:**
```
?limit=20         // Max results (default: 20)
?offset=0         // Pagination offset
?status=building  // Filter by status
```

**Response:**
```typescript
{
  total: number;
  builds: {
    buildId: string;
    buildName: string;
    status: string;
    progress: number;
    startTime: ISO8601;
    nodeCount: number;
    linkCount: number;
  }[];
  timestamp: ISO8601;
}
```

**Example:**
```bash
curl "http://localhost:3000/api/topology/builds/active?limit=10"
```

---

### 7. Get Build History

**Endpoint:** `GET /api/topology/builds/history`

**Purpose:** Get builds history

**Query Parameters:**
```
?limit=50         // Max results (default: 50)
?offset=0         // Pagination offset
?status=success   // Filter by status
?dateFrom=...     // ISO8601 date filter
?dateTo=...       // ISO8601 date filter
```

**Response:**
```typescript
{
  total: number;
  builds: {
    buildId: string;
    buildName: string;
    status: "success" | "failed" | "cancelled";
    startTime: ISO8601;
    endTime: ISO8601;
    duration: number;
    nodeCount: number;
    linkCount: number;
    error?: string;
  }[];
  timestamp: ISO8601;
}
```

---

### 8. Delete Build

**Endpoint:** `DELETE /api/topology/{buildId}`

**Purpose:** Delete build records and any associated files

**Request:**
```typescript
{
  force?: boolean;            // Delete even if still running
  archiveYaml?: boolean;      // Keep YAML backup (default: true)
}
```

**Response:**
```typescript
{
  buildId: string;
  deleted: boolean;
  message: string;
  yamlArchivePath?: string;
  timestamp: ISO8601;
}
```

**Status Codes:**
- `200 OK` - Deleted successfully
- `404 Not Found` - Build ID doesn't exist
- `409 Conflict` - Still running, use force flag
- `500 Internal Server Error` - Server error

---

## Data Validation

### YAML Validation

Before submitting, the frontend should:

1. Check YAML syntax (valid YAML structure)
2. Validate node definitions
3. Ensure required fields present
4. Check link endpoints exist

### Backend Validation

Backend will additionally:

1. Verify containerlab compatibility
2. Check image availability
3. Validate network addresses
4. Check resource availability (disk, memory)

## Error Handling

### Common Errors

**Invalid YAML (400):**
```json
{
  "error": "Invalid YAML syntax",
  "message": "Line 15: expected '<scalar>', but found '-'",
  "line": 15,
  "column": 5
}
```

**Node Not Found (422):**
```json
{
  "error": "Link validation failed",
  "message": "Node 'pc3' referenced in link but not found in nodes",
  "invalidReferences": ["pc3"]
}
```

**Build Failed (500):**
```json
{
  "error": "Build execution failed",
  "message": "Failed to create container 'fw': image not found locally and pull failed",
  "failedNode": "fw",
  "phase": "node-create",
  "suggestion": "Check image name or network connectivity"
}
```

## Authentication

Currently none, but ready for:

```
Authorization: Bearer <token>
X-API-Key: <api-key>
```

## Rate Limiting

- Build requests: 10 per minute per session
- Status checks: 1000 per hour
- Logs retrieval: 100 per minute

---

## Integration Checklist

### Frontend Must:
- [ ] Validate topology JSON before submission
- [ ] Handle SSE auto-reconnection
- [ ] Display progress updates in real-time
- [ ] Show build errors prominently
- [ ] Enable/disable buttons based on build status
- [ ] Clean up EventSource on component unmount
- [ ] Store build history locally

### Backend Must:
- [ ] Generate unique build IDs
- [ ] Stream progress events reliably
- [ ] Handle containerlab execution
- [ ] Log all build activities
- [ ] Clean up resources on failure
- [ ] Store build artifacts
- [ ] Implement proper error reporting

---

## Examples

### Complete Build Workflow

```javascript
class TopologyBuilder {
  async buildTopology(topology) {
    // 1. Validate local
    const validation = validateTopology(topology);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. Convert to YAML
    const yamlContent = topologyToYaml(topology);

    // 3. Submit build
    const response = await fetch('/api/topology/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: topology.name,
        yamlContent,
        description: topology.description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const { buildId } = await response.json();

    // 4. Monitor progress
    return this.monitorBuild(buildId);
  }

  monitorBuild(buildId) {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`/api/topology/${buildId}/progress`);

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        eventSource.close();
        
        if (data.status === 'success') {
          resolve(data);
        } else {
          reject(new Error(`Build failed: ${data.error}`));
        }
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        eventSource.close();
        reject(new Error(data.error));
      });

      // Timeout after 30 minutes
      setTimeout(() => {
        eventSource.close();
        reject(new Error('Build timeout'));
      }, 30 * 60 * 1000);
    });
  }

  async stopTopology(buildId) {
    const response = await fetch(`/api/topology/${buildId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false, cleanup: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }
}
```

