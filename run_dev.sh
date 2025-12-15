#!/bin/bash

# Inspector Twin Development Runner
# This script sets up and runs the Inspector Twin application in development mode

set -e

echo "🚀 Inspector Twin - Starting Development Environment"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
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

# Start the application (renderer + electron)
echo "🎯 Starting Inspector Twin (Vite + Electron)..."
echo ""
echo "The application will open in a new window."
echo "Press Ctrl+C to stop the development server."
echo ""

npm run dev
