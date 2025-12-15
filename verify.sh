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
        echo -e "${YELLOW}⚠${NC} $1 (not executable)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Project Root: $SCRIPT_DIR"
echo ""

# Root files
echo "📄 Root Files"
check_file "package.json"
check_file "tsconfig.json"
check_file "tsconfig.build.json"
check_file ".gitignore"
check_file "README.md"
check_file "IMPLEMENTATION.md"
check_file "CHANGELOG.md"
check_file "QUICKSTART.md"
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
    echo "ℹ️ To fix executable permissions on macOS/Linux:"
    echo "   chmod +x run_dev.sh scripts/build.sh"
    exit 0
else
    echo -e "${RED}✗ $ERRORS errors found${NC}"
    echo ""
    echo "Please ensure all files are present before running:"
    echo "   ./run_dev.sh"
    exit 1
fi
