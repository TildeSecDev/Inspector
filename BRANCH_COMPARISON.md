# QT6 Branch Migration Guide

## Overview

The **QT6** branch represents a complete reimplementation of Inspector Twin as a pure Python desktop application using PyQt6. This eliminates all dependencies on:

- ✗ Rust/Cargo
- ✗ Tauri
- ✗ npm/Node.js
- ✗ TypeScript
- ✗ Vite
- ✗ Web technologies (HTML/CSS/JS)

## Key Differences

### Main Branch (Original)
- **Frontend**: TypeScript + React/Vue + Vite
- **Backend**: Rust + Tauri
- **Desktop**: Webview-based desktop app
- **Build**: Multi-stage (npm install → build, cargo build)
- **Dependencies**: Node.js, Rust, npm packages
- **File Structure**: `apps/`, `src-tauri/`, `apps/renderer/`

### QT6 Branch (PyQt6)
- **Frontend**: PyQt6 (native widgets)
- **Backend**: Python only
- **Desktop**: Native Qt application
- **Build**: Single Python setup (`pip install`)
- **Dependencies**: Python 3.10+, PyQt6
- **File Structure**: `inspector_qt6/`

## Architecture Comparison

### Main Branch Architecture
```
┌─────────────────────────────┐
│   Web Frontend (TS/React)   │
├─────────────────────────────┤
│   Tauri Bridge (Rust)       │
├─────────────────────────────┤
│   System APIs (Rust)        │
└─────────────────────────────┘
```

### QT6 Branch Architecture
```
┌─────────────────────────────┐
│   PyQt6 GUI (Python)        │
├─────────────────────────────┤
│   Business Logic (Python)   │
├─────────────────────────────┤
│   System APIs (Python)      │
└─────────────────────────────┘
```

## Feature Parity

| Feature | Main Branch | QT6 Branch | Notes |
|---------|-------------|------------|-------|
| Topology Editor | ✓ | ✓ | QT6 uses native graphics |
| Device Templates | ✓ | ✓ | |
| YAML Export | ✓ | ✓ | |
| Network Scanning | ✓ | ✓ | Uses Scapy |
| Save/Load | ✓ | ✓ | |
| Validation | ✓ | ✓ | |
| Reports | ✓ | ✓ | Uses ReportLab |
| Web View | ✓ | ✗ | Native UI only |
| Hot Reload | ✓ | ~ | Python reload |

## File Mapping

### TypeScript → Python

| Main Branch | QT6 Branch | Purpose |
|-------------|------------|---------|
| `frontend/topology-utils.ts` | `inspector_qt6/core/topology_utils.py` | Topology utilities |
| `frontend/devices/*.ts` | `inspector_qt6/models/topology.py` | Device models |
| `apps/renderer/src/` | `inspector_qt6/ui/` | UI components |
| `src-tauri/src/` | `inspector_qt6/core/` | Core logic |

### Configuration Files

| Main Branch | QT6 Branch |
|-------------|------------|
| `package.json` | `pyproject.toml` |
| `tsconfig.json` | N/A (no TypeScript) |
| `Cargo.toml` | N/A (no Rust) |
| `tauri.conf.json` | N/A (no Tauri) |
| `vite.config.ts` | N/A (no Vite) |

## Development Workflow

### Main Branch
```bash
# Install dependencies
npm install
cargo build

# Run development
npm run dev          # Frontend
cargo tauri dev      # Desktop app

# Build
npm run build
cargo tauri build
```

### QT6 Branch
```bash
# Install dependencies
pip install -r requirements.txt

# Run development
python -m inspector_qt6

# Build (optional)
pip install pyinstaller
pyinstaller inspector_qt6.spec
```

## Migration Benefits

### Advantages of QT6 Branch

1. **Simpler Dependencies**: Only Python required
2. **Smaller Binary**: No web engine overhead
3. **Faster Startup**: No webview initialization
4. **Native Performance**: Direct system integration
5. **Easier Debugging**: Single language stack
6. **Better Linux Support**: Qt is well-supported on Linux

### Considerations

1. **UI Look**: Native Qt widgets vs custom web UI
2. **Learning Curve**: PyQt6 vs web technologies
3. **Platform Differences**: Qt platform-specific behaviors
4. **Web Features**: No embedded browser capabilities

## Testing

### Main Branch
```bash
npm test              # Frontend tests
cargo test            # Rust tests
npm run test:e2e      # E2E tests
```

### QT6 Branch
```bash
pytest                # All Python tests
pytest-qt             # Qt-specific tests
```

## Deployment

### Main Branch
- Distributes as native apps: `.exe`, `.dmg`, `.deb`
- Includes web engine runtime
- Larger file size (~100-200 MB)

### QT6 Branch
- Distributes as Python app or PyInstaller binary
- Includes Qt runtime
- Moderate file size (~50-100 MB)
- Can also run as Python package

## Choosing a Branch

### Use Main Branch If:
- You need web-based UI flexibility
- You want custom styling with CSS
- You're comfortable with web technologies
- You need embedded browser features

### Use QT6 Branch If:
- You prefer Python-only development
- You want native desktop performance
- You need simpler deployment
- You prefer traditional desktop UI patterns

## Migration Path

### From Main → QT6
1. Checkout QT6 branch: `git checkout QT6`
2. Remove node_modules and target directories
3. Run setup: `./setup_qt6.sh`
4. Run application: `python -m inspector_qt6`

### From QT6 → Main
1. Checkout main branch: `git checkout main`
2. Remove venv directory
3. Run setup: `npm install && cargo build`
4. Run application: `npm run tauri dev`

## Future Plans

Both branches will be maintained in parallel:
- **Main**: Focus on web-based features, cloud integration
- **QT6**: Focus on desktop performance, offline capabilities

Choose the branch that best fits your deployment needs.
