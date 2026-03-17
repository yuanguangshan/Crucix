#!/bin/bash
# ============================================
# Crucix Quick Deploy with Auto-Config
# ============================================
# This script automatically configures environment variables
# Usage: ./deploy-quick.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/yuanguangshan/Crucix.git"
APP_DIR="/opt/crucix"
APP_NAME="crucix"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Crucix - Quick Deployment Script         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# Collect Configuration
# ============================================================
echo -e "${YELLOW}Please provide your API configuration:${NC}"
echo ""

read -p "LLM Provider (openai/anthropic/gemini/codex) [openai]: " LLM_PROVIDER
LLM_PROVIDER=${LLM_PROVIDER:-openai}

read -p "LLM API Key: " LLM_API_KEY
read -p "LLM Model [Assistant]: " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-Assistant}

read -p "Custom Base URL (optional, press Enter to skip): " LLM_BASE_URL

read -p "Telegram Bot Token: " TELEGRAM_BOT_TOKEN
read -p "Telegram Chat ID: " TELEGRAM_CHAT_ID

read -p "Server Port [3117]: " PORT
PORT=${PORT:-3117}

echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "  LLM Provider: $LLM_PROVIDER"
echo "  LLM Model: $LLM_MODEL"
echo "  Base URL: ${LLM_BASE_URL:-default}"
echo "  Telegram: configured"
echo "  Port: $PORT"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# ============================================================
# Install Dependencies
# ============================================================
echo -e "${YELLOW}[1/5] Installing system dependencies...${NC}"
apt-get update -y
apt-get install -y curl git

# ============================================================
# Install Node.js 22
# ============================================================
echo -e "${YELLOW}[2/5] Installing Node.js 22...${NC}"
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 22 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
node --version

# ============================================================
# Install PM2
# ============================================================
echo -e "${YELLOW}[3/5] Installing PM2...${NC}"
npm install -g pm2

# ============================================================
# Deploy Application
# ============================================================
echo -e "${YELLOW}[4/5] Deploying application...${NC}"

if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull
else
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

npm install

# ============================================================
# Configure Environment
# ============================================================
echo -e "${YELLOW}[5/5] Configuring environment...${NC}"

cat > "$APP_DIR/.env" << EOF
# Server Configuration
PORT=$PORT
REFRESH_INTERVAL_MINUTES=15

# LLM Configuration
LLM_PROVIDER=$LLM_PROVIDER
LLM_API_KEY=$LLM_API_KEY
LLM_MODEL=$LLM_MODEL
EOF

if [ -n "$LLM_BASE_URL" ]; then
    echo "LLM_BASE_URL=$LLM_BASE_URL" >> "$APP_DIR/.env"
fi

cat >> "$APP_DIR/.env" << EOF

# Telegram Configuration
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
EOF

# ============================================================
# Start Application
# ============================================================
echo -e "${YELLOW}Starting application...${NC}"

pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start "$APP_DIR/server.mjs" --name "$APP_NAME"

pm2 save
pm2 startup systemd -u root --hp /root

# ============================================================
# Done
# ============================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
pm2 status
echo ""
echo -e "${YELLOW}IMPORTANT: Open port $PORT in Tencent Cloud Firewall${NC}"
echo ""

if command -v curl &> /dev/null; then
    SERVER_IP=$(curl -s ifconfig.me)
    echo -e "${GREEN}Dashboard: http://$SERVER_IP:$PORT${NC}"
fi
echo ""
echo "Useful commands:"
echo "  pm2 logs $APP_NAME  - View logs"
echo "  pm2 restart $APP_NAME - Restart"
echo "  pm2 monit           - Live monitor"
echo ""
