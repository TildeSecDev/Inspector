#!/bin/bash

# Build script for Inspector Twin
# Builds all packages and prepares for packaging

set -e

echo "🔨 Building Inspector Twin..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Clean old builds
echo "🧹 Cleaning old builds..."
npm run clean

# Build all packages
echo "🏗️ Building packages..."
npm run build --workspaces --if-present

# Build renderer
echo "🎨 Building React renderer..."
npm run build --workspace=@inspectortwin/renderer

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  npm run package --workspace=apps/desktop     # Package for current platform"
echo "  npm run package:mac --workspace=apps/desktop # Package for macOS"
echo "  npm run package:win --workspace=apps/desktop # Package for Windows"
echo "  npm run package:linux --workspace=apps/desktop # Package for Linux"
