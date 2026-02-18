#!/bin/bash

# Inspector Twin Development Runner
# This script sets up and runs the Inspector Twin application in development mode

set -e

echo "🚀 Inspector Twin - Starting Development Environment"
echo ""

# On Linux, re-run with sudo -E when not root
if [ "$(uname -s)" = "Linux" ] && [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        echo "🔐 Elevating with sudo -E -S for Linux system dependencies..."
        exec sudo -E "$0" "$@"
    else
        echo "❌ sudo is required on Linux to install system dependencies."
        exit 1
    fi
fi

# Ensure scripts are executable (non-interactive)
chmod +x ./run_dev.sh ./scripts/build.sh 2>/dev/null || true

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

# Ensure Rust/Cargo environment is available in this shell
if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.cargo/env"
    hash -r
fi

# Linux system dependencies for Tauri (non-interactive)
if [ "$PLATFORM" = "Linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
        SUDO=""
        if [ "$(id -u)" -ne 0 ]; then
            if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
                SUDO="sudo -n"
            else
                echo "❌ sudo without password is required to install system dependencies."
                echo "   Re-run as root or configure passwordless sudo for apt-get."
                exit 1
            fi
        fi

        NEED_DEPS=0
        if ! command -v pkg-config >/dev/null 2>&1; then
            NEED_DEPS=1
        elif ! pkg-config --exists glib-2.0 gio-2.0 gobject-2.0 2>/dev/null; then
            NEED_DEPS=1
        fi

        if [ "$NEED_DEPS" -eq 1 ]; then
            echo "📦 Installing Linux build dependencies (pkg-config, GTK/WebKit)..."
            DEBIAN_FRONTEND=noninteractive $SUDO apt-get update -y >/dev/null
            DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y --no-install-recommends \
                build-essential clang pkg-config libglib2.0-dev libgtk-3-dev \
                libwebkit2gtk-4.1-dev librsvg2-dev patchelf

            if ! dpkg -s libappindicator3-dev >/dev/null 2>&1; then
                DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y --no-install-recommends libappindicator3-dev \
                    || DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y --no-install-recommends libayatana-appindicator3-dev
            fi
        fi
    else
        echo "⚠️  apt-get not available. Install pkg-config, GTK, and WebKit deps manually."
    fi
fi

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
    npm install --no-fund --no-audit
else
    echo "✅ Dependencies already installed"
fi

# Build shared workspace package if missing
if [ ! -f "packages/shared/dist/index.js" ]; then
    echo "🔧 Building @inspectortwin/shared..."
    npm run build -w @inspectortwin/shared
fi

# Check for Rust/Cargo (required for Tauri)
if ! command -v cargo >/dev/null 2>&1; then
    echo "⚠️  Rust/Cargo not detected. Installing Rust toolchain..."
    if command -v curl >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- https://sh.rustup.rs | sh -s -- -y
    else
        echo "❌ Neither curl nor wget is available to install Rust."
        exit 1
    fi

    if [ -f "$HOME/.cargo/env" ]; then
        # shellcheck source=/dev/null
        . "$HOME/.cargo/env"
        hash -r
    fi

    if ! command -v cargo >/dev/null 2>&1; then
        echo "❌ Rust/Cargo still not detected after install. Please restart your shell and re-run."
        exit 1
    fi
fi

# Start the application (renderer + tauri)
echo "🎯 Starting Inspector Twin (Vite + Tauri)..."
echo ""
echo "The application will open in a new window."
echo "Press Ctrl+C to stop the development server."
echo ""

npm run dev:tauri
