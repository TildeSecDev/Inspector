#!/bin/bash

# Inspector Twin Development Runner
# This script sets up and runs the Inspector Twin application in development mode

set -e

echo "🚀 Inspector Twin - Starting Development Environment"
echo ""

# Detect OS (macOS vs Linux)
OS_NAME="$(uname -s)"
case "$OS_NAME" in
    Darwin)
        PLATFORM="macOS"
        ;;
    Linux)
        PLATFORM="Linux"
        ;;
    *)
        echo "❌ Unsupported OS: $OS_NAME"
        echo "This script supports macOS and Linux only."
        exit 1
        ;;
esac

echo "🖥️  Detected OS: $PLATFORM"
echo ""

# Verify environment and install prerequisites as needed
if [ ! -f "./verify.sh" ]; then
    echo "❌ verify.sh not found. Cannot verify prerequisites."
    exit 1
fi

if [ ! -x "./verify.sh" ]; then
    echo "⚠️  verify.sh is not executable. Attempting to continue with bash."
    AUTO_YES=1 bash ./verify.sh
else
    AUTO_YES=1 ./verify.sh
fi

echo "✅ Environment verification complete"
echo ""

# Check Node.js version
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check for Rust/Cargo (required for Tauri)
if ! command -v cargo >/dev/null 2>&1; then
    echo "❌ Rust/Cargo is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Start the application (renderer + tauri)
echo "🎯 Starting Inspector Twin (Vite + Tauri)..."
echo ""
echo "The application will open in a new window."
echo "Press Ctrl+C to stop the development server."
echo ""

npm run dev:tauri
