#!/bin/bash

# Inspector Twin - Development Environment Launcher
# Starts both the Vite dev server and Electron app with HMR enabled

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Inspector Twin - Development Environment${NC}"
echo "Starting Vite dev server and Electron..."
echo ""

# Check if Node modules are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Function to handle cleanup on script exit
cleanup() {
  echo -e "${YELLOW}Shutting down development environment...${NC}"
  kill %1 %2 2>/dev/null || true
  exit 0
}

# Trap signals to ensure cleanup
trap cleanup SIGINT SIGTERM

# Start Vite dev server in background
echo -e "${YELLOW}Starting Vite dev server on localhost:5173...${NC}"
npm run dev:vite &
VITE_PID=$!

# Wait for Vite server to be ready (max 30 seconds)
echo "Waiting for Vite server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Vite server ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Vite server failed to start${NC}"
    kill $VITE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Small delay to ensure server is fully responsive
sleep 2

# Start Electron in development mode
echo -e "${YELLOW}Starting Electron...${NC}"
NODE_ENV=development npm run dev &
ELECTRON_PID=$!

# Wait for both processes
wait %1 %2 2>/dev/null || true

cleanup
