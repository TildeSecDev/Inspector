# Inspector Twin

**Digital Twin Simulation and Security Assessment Platform**

Inspector Twin (formerly Inspector-BE) is a desktop Electron application that enables organizations to create digital twins of their physical and digital environments, run safe simulations, and perform authorized local security assessments.

## ⚠️ Important Notice

**Inspector Twin is designed for simulation and authorized local testing only.**

Do not use this tool to target real systems without written permission. The application enforces local-only constraints by default and includes safety mechanisms to prevent misuse.

## Features

### Digital Twin Designer

- Drag-and-drop topology canvas using React Flow
- Support for multiple node types: routers, switches, firewalls, servers, workstations, IoT devices, cloud services
- Visual link configuration with bandwidth, latency, and failure simulation
- Property panels for detailed node/link configuration
- Firewall policy DSL for security rules

### Simulation Engine

- Packet flow animation and routing simulation
- Firewall policy evaluation
- Failure injection (link down, degradation, node failure)
- Network reachability and latency analysis
- Attack event simulation (credential reuse, phishing, lateral movement, data exfiltration)

### Security Assessment

- Topology misconfiguration detection
- Single point of failure identification
- Exposed service analysis
- Network segmentation validation
- Policy enforcement testing

### Local Lab Testing (Optional)

- Docker container orchestration for safe testing
- Localhost-only enforcement
- Configurable test environments
- Service monitoring and management

### Reporting

- JSON and PDF report generation
- Findings categorized by severity
- Remediation recommendations
- Event timeline and metrics
- Architecture summaries

## Tech Stack

- **Runtime**: Node.js 18+ + Electron 28
- **UI**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Canvas**: React Flow (topology designer)
- **Editor**: Monaco Editor (policy DSL)
- **Database**: SQLite via better-sqlite3
- **Validation**: Zod
- **Reports**: pdf-lib
- **Container Management**: dockerode (optional)
- **Testing**: Vitest + Playwright

## Installation

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- (Optional) Docker for lab testing features

### Quick Start

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd inspectortwin
   ```
2. **Install dependencies**:

   ```bash
   npm install
   ```
3. **Run in development mode**:

   **macOS/Linux**:

   ```bash
   chmod +x run_dev.sh
   ./run_dev.sh
   ```

   **Windows**:

   ```cmd
   run_dev.bat
   ```

The application will automatically:

- Install all workspace dependencies
- Build all packages
- Start the Vite dev server
- Launch the Electron window

## Project Structure

```
inspectortwin/
├── apps/
│   ├── desktop/          # Electron main process + preload
│   └── renderer/         # React UI (Vite)
├── packages/
│   ├── shared/           # Shared types and Zod schemas
│   ├── core-sim/         # Simulation engine
│   ├── project-store/    # SQLite storage layer
│   ├── policy-dsl/       # Firewall policy parser
│   ├── report-kit/       # Report generation
│   └── lab-runtime/      # Docker lab orchestration
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
├── run_dev.sh            # Development runner (Unix)
├── run_dev.bat           # Development runner (Windows)
└── package.json          # Root workspace config
```

## Usage

### 1. Create a Project

1. Launch Inspector Twin
2. Navigate to "Projects"
3. Click "New Project"
4. Enter project name and description

### 2. Build a Topology

1. Select your project
2. Navigate to "Twin Designer"
3. Select node type from dropdown
4. Click "Add Node" to place nodes on canvas
5. Drag connections between nodes
6. Click "Save" to persist topology

### 3. Create a Scenario

1. Navigate to "Scenarios"
2. Click "Create Scenario"
3. Define traffic flows
4. Add fault injections (optional)
5. Configure attack simulations (optional)
6. Save scenario

### 4. Run Simulation

1. Navigate to "Simulation Runner"
2. Ensure topology and scenario are selected
3. Click "Run Simulation"
4. View real-time event timeline
5. Review metrics (packets, latency, policies)

### 5. Review Findings

1. Navigate to "Findings"
2. Review findings categorized by severity:
   - Critical (red)
   - High (orange)
   - Medium (yellow)
   - Low (blue)
   - Info (gray)
3. Read remediation recommendations

### 6. Generate Reports

1. Navigate to "Reports"
2. Click "Export JSON" for machine-readable format
3. Click "Export PDF" for human-readable report
4. Reports saved to Documents/InspectorTwin/

## Firewall Policy DSL

Inspector Twin includes a simple DSL for defining firewall rules:

```
allow tcp from Users to WebApp port 443
deny any from Guests to Internal
allow dns from Any to DNS
deny tcp from Any to AdminPanel port 22
```

**Syntax**: `<action> <protocol?> from <source> to <destination> port <port?>`

- **Actions**: `allow`, `deny`
- **Protocols**: `tcp`, `udp`, `icmp`, `dns`, `any`
- **Sources/Destinations**: Node IDs, tags, or `Any`
- **Ports**: Single port or range (e.g., `80-443`)

## Security Features

### Built-in Safety Mechanisms

1. **Local-Only Enforcement**: Lab runtime only binds to 127.0.0.1
2. **Context Isolation**: Electron runs with `contextIsolation: true` and `nodeIntegration: false`
3. **CSP Headers**: Content Security Policy prevents external script execution
4. **Sandbox Mode**: Renderer process runs in sandbox
5. **IPC Whitelisting**: Only explicitly exposed APIs available to renderer
6. **Config Validation**: Lab configurations validated before execution

### Rules of Engagement

Before running any "security checks", the application displays warnings and requires acknowledgment that:

- Testing is authorized
- Tests run only against local containers or simulations
- No external targeting is permitted

## Development

### Build Commands

```bash
# Install all dependencies
npm install

# Run in development mode
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Package a Desktop App

```bash
# Build for current platform
npm run package --workspace=apps/desktop

# Build for specific platforms
npm run package:mac --workspace=apps/desktop
npm run package:win --workspace=apps/desktop
npm run package:linux --workspace=apps/desktop
```

Packaged apps will be in `apps/desktop/release/`.

## Workspace Packages

### @inspectortwin/shared

Common types and Zod schemas used across all packages.

### @inspectortwin/project-store

SQLite-based storage layer with repositories for projects, topologies, scenarios, runs, findings, and reports.

### @inspectortwin/policy-dsl

Parser, validator, and evaluator for firewall policy DSL.

### @inspectortwin/core-sim

Simulation engine with graph validation, routing, packet flow simulation, and failure injection.

### @inspectortwin/report-kit

Report generator supporting JSON and PDF formats using pdf-lib.

### @inspectortwin/lab-runtime

Optional Docker container orchestration for local testing with safety enforcement.

## Sample Projects

Inspector Twin ships with two sample projects:

1. **SME Office + Cloud App**

   - Scenarios: ISP link failure, guest network isolation test, attacker on network
2. **School Lab + Guest Wi-Fi Segmentation**

   - Scenarios: Guest trying to reach admin panel, link degradation, credential reuse attack

Load these from the Projects page to see examples.

## Testing

```bash
# Run unit tests
npm run test

# Run UI tests with Playwright
npx playwright test --workspace=apps/renderer
```

## Troubleshooting

### Application won't start

- Ensure Node.js 18+ is installed: `node -v`
- Delete `node_modules` and run `npm install` again
- Check for port conflicts (default: 5173)

### Database errors

- Database file is in: `~/Library/Application Support/inspectortwin/` (macOS)
- Delete database file to reset (will lose data)

### Docker lab won't start

- Ensure Docker is installed and running
- Check Docker daemon is accessible
- Verify localhost-only binding in lab config

### Build failures

- Run `npm run clean` then `npm install`
- Ensure all peer dependencies are satisfied
- Check TypeScript version compatibility

## Contributing

Contributions are welcome! Please ensure:

- Code follows existing style
- Tests are included
- Documentation is updated
- Security constraints are maintained

## License

**Inspector Twin** is proprietary software developed by Nathan Brown-Bennett, Wadoud Zakour, and the TildeSec team for TildeSec only.

**Unauthorized copying, modification, or distribution is strictly prohibited.**

All rights reserved. This software is provided as-is for authorized use by TildeSec personnel only. Any use outside of TildeSec requires explicit written permission from the copyright holders.

## Disclaimer

Inspector Twin is a simulation and testing tool intended for educational and authorized security assessment purposes only. Users are responsible for ensuring they have proper authorization before conducting any security testing. The developers are not responsible for misuse of this tool.

**Use responsibly. Test ethically. Always get permission.**

---

**Inspector Twin** - Safe Simulation, Authorized Testing, Better Security
