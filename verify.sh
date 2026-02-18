#!/bin/bash

# Inspector Twin - Project Verification Script
# Checks that all files are in place and structure is valid

echo "🔍 Inspector Twin - Project Verification"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
EXEC_WARNINGS=0
AUTO_YES=${AUTO_YES:-0}
REQUIRED_NODE_MAJOR=18
REQUIRED_NPM_MAJOR=9

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
}

check_executable() {
    if [ -x "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 (executable)"
    elif [ -f "$1" ]; then
        if [ "$AUTO_YES" = "1" ]; then
            chmod +x "$1" 2>/dev/null || true
            if [ -x "$1" ]; then
                echo -e "${GREEN}✓${NC} $1 (executable)"
                return 0
            fi
        fi
        echo -e "${YELLOW}⚠${NC} $1 (not executable)"
        WARNINGS=$((WARNINGS + 1))
        EXEC_WARNINGS=$((EXEC_WARNINGS + 1))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
}

note() {
    echo -e "${YELLOW}•${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

has_cmd() {
    command -v "$1" >/dev/null 2>&1
}

print_version() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        local value
        value=$(eval "$cmd" 2>/dev/null | head -n 1)
        echo -e "${GREEN}✓${NC} $label: $value"
    else
        warn "$label: not installed"
    fi
}

confirm() {
    local prompt="$1"
    if [ "$AUTO_YES" = "1" ]; then
        return 0
    fi
    read -r -p "$prompt [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]]
}

load_nvm() {
    if [ -n "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
        # shellcheck source=/dev/null
        . "$NVM_DIR/nvm.sh"
    fi
    has_cmd nvm
}

ensure_node() {
    local node_version=""
    local node_major=""
    if has_cmd node; then
        node_version=$(node -v | sed 's/^v//')
        node_major=$(echo "$node_version" | cut -d. -f1)
        if [ "$node_major" -ge "$REQUIRED_NODE_MAJOR" ]; then
            echo -e "${GREEN}✓${NC} Node.js v$node_version"
            return 0
        fi
        warn "Node.js v$node_version is below required v$REQUIRED_NODE_MAJOR"
    else
        warn "Node.js not installed"
    fi

    if load_nvm; then
        if confirm "Install/upgrade Node.js $REQUIRED_NODE_MAJOR using nvm?"; then
            nvm install "$REQUIRED_NODE_MAJOR" && nvm use "$REQUIRED_NODE_MAJOR" || error "Failed to install Node.js via nvm"
            return 0
        fi
    elif has_cmd brew; then
        if confirm "Install/upgrade Node.js $REQUIRED_NODE_MAJOR using Homebrew?"; then
            brew install node@"$REQUIRED_NODE_MAJOR" || error "Failed to install node@${REQUIRED_NODE_MAJOR}"
            brew link --force --overwrite node@"$REQUIRED_NODE_MAJOR" >/dev/null 2>&1 || true
            return 0
        fi
    else
        error "Cannot install Node.js automatically (nvm/Homebrew not found)."
    fi
}

ensure_npm() {
    if ! has_cmd npm; then
        error "npm not available (install Node.js first)."
        return 1
    fi
    local npm_version
    local npm_major
    npm_version=$(npm -v)
    npm_major=$(echo "$npm_version" | cut -d. -f1)
    if [ "$npm_major" -ge "$REQUIRED_NPM_MAJOR" ]; then
        echo -e "${GREEN}✓${NC} npm v$npm_version"
        return 0
    fi
    warn "npm v$npm_version is below required v$REQUIRED_NPM_MAJOR"
    if confirm "Upgrade npm to v$REQUIRED_NPM_MAJOR?"; then
        npm install -g "npm@${REQUIRED_NPM_MAJOR}" || error "Failed to upgrade npm"
    fi
}

ensure_docker() {
    if has_cmd docker; then
        echo -e "${GREEN}✓${NC} $(docker --version)"
        if ! docker info >/dev/null 2>&1; then
            warn "Docker is installed but not running. Start Docker Desktop."
        fi
        return 0
    fi
    warn "Docker not installed"
    if has_cmd brew; then
        if confirm "Install Docker Desktop with Homebrew?"; then
            brew install --cask docker || error "Failed to install Docker"
        fi
    else
        warn "Cannot auto-install Docker (Homebrew not found)."
    fi
}

ensure_rust() {
    if has_cmd cargo && has_cmd rustc; then
        echo -e "${GREEN}✓${NC} $(rustc --version)"
        echo -e "${GREEN}✓${NC} $(cargo --version)"
        return 0
    fi
    warn "Rust toolchain not installed"
    if confirm "Install Rust toolchain via rustup?"; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || error "Failed to install rustup"
        if [ -s "$HOME/.cargo/env" ]; then
            # shellcheck source=/dev/null
            . "$HOME/.cargo/env"
            hash -r
        fi
    fi
}

ensure_tauri_cli() {
    if ! has_cmd cargo; then
        warn "cargo not available; skipping tauri CLI check"
        return 0
    fi
    if cargo tauri -V >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $(cargo tauri -V)"
        return 0
    fi
    warn "tauri CLI not installed"
    if confirm "Install tauri CLI (v2) via cargo?"; then
        cargo install tauri-cli --locked --version "^2" || error "Failed to install tauri CLI"
    fi
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Project Root: $SCRIPT_DIR"
echo ""

echo "🧰 Environment Checks"
print_version "OS" "uname -a"
print_version "Git" "git --version"
print_version "Homebrew" "brew --version"
echo ""

ensure_node
ensure_npm
ensure_docker
ensure_rust
ensure_tauri_cli
echo ""

# Root files
echo "📄 Root Files"
check_file "package.json"
check_file "tsconfig.json"
check_file "tsconfig.build.json"
check_file ".gitignore"
check_file "README.md"
if [ -f "IMPLEMENTATION.md" ]; then
    check_file "IMPLEMENTATION.md"
else
    warn "IMPLEMENTATION.md (missing)"
fi
check_file "CHANGELOG.md"
if [ -f "QUICKSTART.md" ]; then
    check_file "QUICKSTART.md"
else
    warn "QUICKSTART.md (missing)"
fi
check_executable "run_dev.sh"
check_file "run_dev.bat"
echo ""

# Scripts
echo "🛠️ Build Scripts"
check_file "scripts/build.sh"
check_executable "scripts/build.sh"
echo ""

# Backend Packages
echo "📦 Backend Packages"
for pkg in shared project-store policy-dsl core-sim report-kit lab-runtime; do
    check_dir "packages/$pkg"
    check_file "packages/$pkg/package.json"
    check_file "packages/$pkg/tsconfig.json"
    check_dir "packages/$pkg/src"
done
echo ""

# Frontend Apps
echo "🎨 Frontend Apps"
check_dir "apps/desktop"
check_file "apps/desktop/package.json"
check_file "apps/desktop/src/main.ts"
check_file "apps/desktop/src/preload.ts"
echo ""

check_dir "apps/renderer"
check_file "apps/renderer/package.json"
check_file "apps/renderer/vite.config.ts"
check_file "apps/renderer/src/App.tsx"
check_file "apps/renderer/src/main.tsx"
check_file "apps/renderer/src/index.css"
check_file "apps/renderer/src/store/appStore.ts"
echo ""

# Key Source Files
echo "📝 Key Source Files"
check_file "packages/shared/src/schemas.ts"
check_file "packages/shared/src/sample-data.ts"
check_file "packages/shared/src/index.ts"
echo ""

check_file "packages/project-store/src/migrations.ts"
check_file "packages/project-store/src/repositories.ts"
check_file "packages/project-store/src/index.ts"
echo ""

check_file "packages/policy-dsl/src/policy.ts"
check_file "packages/policy-dsl/src/policy.test.ts"
check_file "packages/policy-dsl/src/index.ts"
check_file "packages/policy-dsl/vitest.config.ts"
echo ""

check_file "packages/core-sim/src/validation.ts"
check_file "packages/core-sim/src/simulator.ts"
check_file "packages/core-sim/src/blast-radius.ts"
check_file "packages/core-sim/src/validation.test.ts"
check_file "packages/core-sim/src/index.ts"
check_file "packages/core-sim/vitest.config.ts"
echo ""

check_file "packages/report-kit/src/report-generator.ts"
check_file "packages/report-kit/src/index.ts"
echo ""

check_file "packages/lab-runtime/src/lab-runtime.ts"
check_file "packages/lab-runtime/src/index.ts"
echo ""

# React Components
echo "⚛️ React Components"
check_dir "apps/renderer/src/pages"
check_file "apps/renderer/src/pages/ProjectsPage.tsx"
check_file "apps/renderer/src/pages/TwinDesignerPage.tsx"
check_file "apps/renderer/src/pages/ScenariosPage.tsx"
check_file "apps/renderer/src/pages/SimulationRunnerPage.tsx"
check_file "apps/renderer/src/pages/FindingsPage.tsx"
check_file "apps/renderer/src/pages/ReportsPage.tsx"
check_file "apps/renderer/src/pages/SettingsPage.tsx"
echo ""

check_dir "apps/renderer/src/components"
check_file "apps/renderer/src/components/Layout.tsx"
echo ""

# Type definitions
echo "🔧 Type Definitions"
check_file "apps/renderer/src/types/electron.d.ts"
echo ""

# Summary
echo "========================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "🚀 Ready to start:"
    echo "   npm install"
    echo "   ./run_dev.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings${NC} (non-critical)"
    echo ""
    if [ $EXEC_WARNINGS -gt 0 ]; then
        echo "ℹ️ To fix executable permissions on macOS/Linux:"
        echo "   chmod +x run_dev.sh scripts/build.sh"
    fi
    exit 0
else
    echo -e "${RED}✗ $ERRORS errors found${NC}"
    echo ""
    echo "Please ensure all files are present before running:"
    echo "   ./run_dev.sh"
    exit 1
fi
