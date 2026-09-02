#!/usr/bin/env bash
# ==============================================================================
#  ULP Data Stream Inspector - One-Command Termux Launcher
#  Optimized for Qualcomm Snapdragon 8 Elite (Oryon CPU) on Android Termux
# ==============================================================================

set -e

# ANSI Color Tokens
CYAN='\033[0;36m'
EMERALD='\033[0;32m'
AMBER='\033[0;33m'
ROSE='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "======================================================"
echo "  ⚡ ULP DATA STREAM INSPECTOR · SNAPDRAGON 8 ELITE"
echo "  Android Termux Zero-Configuration Launcher"
echo "======================================================"
echo -e "${NC}"

# 1. Detect Termux Environment
IS_TERMUX=false
if [ -d "/data/data/com.termux" ] || [ -n "$TERMUX_VERSION" ]; then
    IS_TERMUX=true
    echo -e "${EMERALD}✓ Android Termux environment detected${NC}"
fi

# 2. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${AMBER}➜ Node.js not detected. Installing via pkg...${NC}"
    if [ "$IS_TERMUX" = true ]; then
        pkg update -y && pkg install nodejs -y
    else
        echo -e "${ROSE}Error: Node.js is required. Please install Node.js (v18+).${NC}"
        exit 1
    fi
fi
NODE_VER=$(node -v)
echo -e "${EMERALD}✓ Node.js runtime: ${NODE_VER}${NC}"

# 3. Check Ripgrep (Crucial for ultra-high-speed Snapdragon 8 Elite regex stream)
if ! command -v rg >/dev/null 2>&1; then
    echo -e "${AMBER}➜ Ripgrep (rg) not detected. Installing via pkg...${NC}"
    if [ "$IS_TERMUX" = true ]; then
        pkg install ripgrep -y
    else
        echo -e "${AMBER}Warning: 'rg' (ripgrep) not found in PATH. Install ripgrep for maximum search speed.${NC}"
    fi
fi
if command -v rg >/dev/null 2>&1; then
    echo -e "${EMERALD}✓ Ripgrep engine: $(rg --version | head -n 1)${NC}"
fi

# 4. Ensure Dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}➜ Installing project dependencies (npm install)...${NC}"
    npm install
fi

# 5. Ensure Client Build Exists
if [ ! -f "server/public/index.html" ]; then
    echo -e "${CYAN}➜ Building production frontend assets (npm run build)...${NC}"
    npm run build
fi

# 6. Ensure ~/logs directory exists
LOGS_DIR="$HOME/logs"
if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${CYAN}➜ Creating target logs directory: ${LOGS_DIR}${NC}"
    mkdir -p "$LOGS_DIR"
fi

# If ~/logs is empty, generate initial mock dataset for immediate testing
FILE_COUNT=$(find "$LOGS_DIR" -maxdepth 1 -type f 2>/dev/null | wc -l)
if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${AMBER}➜ ${LOGS_DIR} is empty. Generating initial mock dataset (20,000 combo lines)...${NC}"
    node generate_mock_data.js || true
fi

# 7. Port 80 Privilege Notice for Termux
DEFAULT_PORT=80
TARGET_PORT="${PORT:-$DEFAULT_PORT}"

if [ "$TARGET_PORT" -eq 80 ] && [ "$EUID" -ne 0 ] && [ "$IS_TERMUX" = true ]; then
    echo -e "${AMBER}ℹ️  NOTE: Port 80 is a privileged port (<1024).${NC}"
    echo -e "${AMBER}   If not running as root ('tsu'), the server will auto-fallback to port 8080.${NC}"
    echo -e "${AMBER}   (To use port 80 directly on rooted devices, run: tsu -c \"npm start\")${NC}"
fi

echo -e "\n${EMERALD}${BOLD}🚀 Launching ULP Fastify Engine...${NC}\n"

# 8. Start the Fastify Server
export NODE_ENV=production
exec node server/server.js
