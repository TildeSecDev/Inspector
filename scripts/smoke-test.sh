#!/bin/bash
set -e

# Inspector Twin Smoke Test Runner
# Orchestrates: build → seed → start app → run Playwright tests

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Build packages
log_info "Building Inspector Twin packages..."
npm run build

# Step 2: Seed database with sample data
log_info "Seeding database with sample projects and scenarios..."
npm run seed

# Step 3: Build and start the desktop app in the background
log_info "Starting Inspector Twin desktop app..."
npm run dev > /tmp/inspector-twin-dev.log 2>&1 &
DEV_PID=$!

# Wait for app to start
log_info "Waiting for app to be ready (30s timeout)..."
timeout=30
while [ $timeout -gt 0 ]; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    log_info "Renderer is ready at http://localhost:5173"
    break
  fi
  sleep 1
  timeout=$((timeout - 1))
done

if [ $timeout -le 0 ]; then
  log_error "App failed to start within 30 seconds"
  kill $DEV_PID 2>/dev/null || true
  exit 1
fi

# Step 4: Run Playwright smoke tests
log_info "Running Playwright smoke tests..."
if npm run test:smoke; then
  log_info "✓ Smoke tests passed"
  TEST_RESULT=0
else
  log_error "✗ Smoke tests failed"
  TEST_RESULT=1
fi

# Cleanup
log_info "Stopping Inspector Twin..."
kill $DEV_PID 2>/dev/null || true
sleep 2

if [ $TEST_RESULT -eq 0 ]; then
  log_info "✓ All smoke tests completed successfully"
  exit 0
else
  log_error "✗ Smoke tests failed"
  log_warn "Dev server log at /tmp/inspector-twin-dev.log"
  exit 1
fi
