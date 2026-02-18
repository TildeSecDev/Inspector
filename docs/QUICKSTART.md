# QUICKSTART CHECKLIST

## Pre-Flight Checks
- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm 9+ installed (`npm -v`)
- [ ] Docker installed and running (for lab features)
- [ ] ~2GB disk space available
- [ ] Terminal with bash/zsh (macOS/Linux) or cmd/PowerShell (Windows)

## Installation

### 1. Navigate to Project
```bash
cd /Users/nathanbrown-bennett/Inspector/inspectortwin
```

### 2. Install Dependencies
```bash
npm install
```
*Takes 2-3 minutes, installs ~500 packages across workspaces*

### 3. Start Development Server
```bash
./run_dev.sh          # macOS/Linux
# or
run_dev.bat           # Windows
```

**What this does:**
- ✅ Builds all backend packages (@inspectortwin/shared, project-store, policy-dsl, core-sim, report-kit, lab-runtime)
- ✅ Starts Vite dev server on localhost:5173
- ✅ Launches Electron window with hot-reload enabled
- ✅ Auto-initializes SQLite database with schema
- ✅ Takes 30-45 seconds first run (caching after)

### 4. Verify in Browser (Optional)
Open http://localhost:5173 in any browser to see the same UI (without Electron window features)

## First Workflow (5 minutes)

### Create a Project
1. Click **Projects** in sidebar
2. Click "New Project" button
3. Enter name: "My First Twin"
4. Description: "Testing Inspector Twin"
5. Click Create

### Design a Topology
1. Click **Twin Designer** in sidebar
2. From "Add Node" dropdown, select "Server"
3. Click canvas to place node
4. Repeat 3-4 more times with different types (Firewall, Workstation, Router)
5. Drag from one node to another to create links
6. Click **Save** to persist topology

### Define a Scenario
1. Click **Scenarios** in sidebar
2. Click "New Scenario" button
3. Name it "Network Outage"
4. In "Faults" section, select a link and mark as "down"
5. Click Create

### Run a Simulation
1. Click **Simulation Runner** in sidebar
2. Select your scenario
3. Click **Run Simulation** button
4. Watch the event timeline and metrics
5. View auto-generated findings

### Review Findings
1. Click **Findings** in sidebar
2. See severity-categorized issues
3. Read descriptions and remediation steps

### Generate Report
1. Click **Reports** in sidebar
2. Click **Export JSON** or **Export PDF**
3. Check ~/Documents/InspectorTwin/ for output

## Sample Projects (Pre-Loaded)

Inspector Twin includes 2 ready-to-use sample projects:

### Project 1: SME Office + Cloud
- 8 nodes (router, firewall, servers, workstations, cloud service)
- 3 scenarios:
  1. **ISP Failure**: Main internet link goes down
  2. **Guest Isolation**: Test network segmentation
  3. **Attacker in Network**: Compromised workstation
- Demonstrates routing, policies, and blast radius

### Project 2: School Lab
- 6 nodes (servers, workstations, mobile devices)
- 3 scenarios:
  1. **Admin Access**: Privilege escalation attempts
  2. **Link Degradation**: Performance under latency
  3. **Credential Reuse**: Lateral movement

**To load samples:**
1. Go to **Projects** page
2. Click "Load Sample Projects" button
3. Both projects appear with all scenarios ready to simulate

## File Locations

| What | Location |
|------|----------|
| **Source Code** | `/Users/nathanbrown-bennett/Inspector/inspectortwin/` |
| **Backend Packages** | `/packages/*/src/` |
| **React App** | `/apps/renderer/src/` |
| **Electron Main** | `/apps/desktop/src/main.ts` |
| **Database** | `~/.local/share/inspectortwin/` (Linux/macOS) or `%APPDATA%\inspectortwin\` (Windows) |
| **Generated Reports** | `~/Documents/InspectorTwin/` |
| **Logs** | Dev tools → Console tab in Electron window |

## Troubleshooting

### "Command not found: npm"
```bash
# Install Node.js from https://nodejs.org/
node -v  # Verify installation
```

### "Port 5173 already in use"
```bash
# Kill the process using port 5173
kill -9 $(lsof -t -i:5173)  # macOS/Linux
netstat -ano | findstr :5173  # Windows (then taskkill /PID)
```

### "Cannot find module '@inspectortwin/shared'"
```bash
# Rebuild workspace links
npm install
npm run build --workspaces
```

### "Database locked" error
```bash
# Delete and recreate database
rm ~/.local/share/inspectortwin/database.sqlite
# Restart application - will reinitialize
```

### "Docker connection failed"
```bash
# Verify Docker is running
docker ps

# On macOS, may need to start Docker daemon
open /Applications/Docker.app
```

### "Cannot create nodes in Twin Designer"
```bash
# Refresh page: Ctrl+R or Cmd+R
# Clear localStorage: Dev Tools → Application → Local Storage → Clear All
# Restart application
```

## Development Mode

### Hot Reload
- Changes to React components (.tsx) auto-reload in Electron window
- Changes to packages require `npm run build`

### Debug Mode
```bash
# Open Electron DevTools
Press: Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (macOS)
```

### View Logs
```bash
# Tail main process logs
tail -f ~/.local/share/inspectortwin/logs/main.log

# Or in DevTools Console
# All IPC calls logged
```

## Production Build

### Package for Current Platform
```bash
./scripts/build.sh
npm run package --workspace=apps/desktop
```

Output in `/apps/desktop/dist/`:
- macOS: `Inspector Twin.dmg`
- Windows: `Inspector Twin Setup.exe`
- Linux: `Inspector Twin.AppImage`

### Cross-Platform Builds
```bash
npm run package:mac --workspace=apps/desktop   # Build for macOS (dmg)
npm run package:win --workspace=apps/desktop   # Build for Windows (exe)
npm run package:linux --workspace=apps/desktop # Build for Linux (AppImage)
```

## API Reference (For Development)

### IPC Channels
```typescript
// Projects
window.electronAPI.project.create(name, description) → projectId
window.electronAPI.project.getAll() → Project[]
window.electronAPI.project.getById(projectId) → Project
window.electronAPI.project.update(projectId, updates) → void
window.electronAPI.project.delete(projectId) → void

// Topologies (Graphs)
window.electronAPI.topology.create(projectId, name, graph) → topologyId
window.electronAPI.topology.getByProjectId(projectId) → Topology[]
window.electronAPI.topology.getById(topologyId) → Topology
window.electronAPI.topology.update(topologyId, graph) → void
window.electronAPI.topology.delete(topologyId) → void

// Scenarios
window.electronAPI.scenario.create(projectId, name, flows, faults, attackEvents) → scenarioId
window.electronAPI.scenario.getByProjectId(projectId) → Scenario[]
window.electronAPI.scenario.getById(scenarioId) → Scenario
window.electronAPI.scenario.delete(scenarioId) → void

// Simulations
window.electronAPI.simulation.run(scenarioId, policies) → RunResult
window.electronAPI.simulation.getRuns(scenarioId) → RunResult[]
window.electronAPI.simulation.getRunById(runId) → RunResult

// Findings
window.electronAPI.findings.getByRunId(runId) → Finding[]

// Reports
window.electronAPI.report.generate(runId, format: 'json'|'pdf') → filepath
window.electronAPI.report.getByRunId(runId) → Report

// Lab (Docker)
window.electronAPI.lab.start(config: LabConfig) → void
window.electronAPI.lab.stop(labId) → void
window.electronAPI.lab.getStatus(labId) → LabStatus

// Settings
window.electronAPI.settings.get(key) → any
window.electronAPI.settings.set(key, value) → void
```

## Support

### For Issues
1. Check `/docs/` folder for detailed guides
2. Review error messages in DevTools console
3. Delete and recreate database (see Troubleshooting)
4. Check sample projects work (validates environment)

### Documentation
- [README.md](./README.md) - Feature overview and usage guide
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Technical architecture
- [CHANGELOG.md](./CHANGELOG.md) - Version history and features

### Performance Tips
- Limit topology to <50 nodes for smooth dragging
- Use scenarios with <10 flows for fast simulation
- Close DevTools when not debugging (improves performance)
- Increase Electron window size for better UX

---

**Ready to go!** 🚀

Start with:
```bash
cd /Users/nathanbrown-bennett/Inspector/inspectortwin && ./run_dev.sh
```
