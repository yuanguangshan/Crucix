#!/bin/bash
# ============================================
# Crucix Deployment Script for Tencent Cloud
# ============================================
# Usage:
#   1. Upload this script to your server
#   2. chmod +x deploy-tencent-cloud.sh
#   3. ./deploy-tencent-cloud.sh

set -e  # Exit on error

echo "╔══════════════════════════════════════════════╗"
echo "║     Crucix - Tencent Cloud Deployment       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/yuanguangshan/Crucix.git"
APP_DIR="/opt/crucix"
APP_NAME="crucix"
PORT=3117

# ============================================================
# Step 1: System Update
# ============================================================
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# ============================================================
# Step 2: Install Node.js 22
# ============================================================
echo -e "${YELLOW}[2/8] Installing Node.js 22...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        echo "Node.js version is $NODE_VERSION, upgrading to 22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    else
        echo "Node.js $NODE_VERSION already installed."
    fi
else
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

node --version
npm --version

# ============================================================
# Step 3: Install PM2
# ============================================================
echo -e "${YELLOW}[3/8] Installing PM2 process manager...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 already installed."
fi

# ============================================================
# Step 4: Clone Repository
# ============================================================
echo -e "${YELLOW}[4/8] Cloning Crucix repository...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull
else
    echo "Cloning repository..."
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ============================================================
# Step 5: Install Dependencies
# ============================================================
echo -e "${YELLOW}[5/8] Installing dependencies...${NC}"
cd "$APP_DIR"
npm install

# ============================================================
# Step 6: Environment Configuration
# ============================================================
echo -e "${YELLOW}[6/8] Setting up environment variables...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating .env file from template..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}IMPORTANT: Edit .env with your API keys!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Run: nano $APP_DIR/.env"
    echo ""
    echo "Required variables:"
    echo "  - LLM_PROVIDER=openai"
    echo "  - LLM_API_KEY=your_key_here"
    echo "  - LLM_MODEL=Assistant"
    echo "  - LLM_BASE_URL=https://aiproxy.want.biz/v1"
    echo "  - TELEGRAM_BOT_TOKEN=your_token"
    echo "  - TELEGRAM_CHAT_ID=your_chat_id"
    echo ""
    read -p "Press Enter after configuring .env to continue..."
else
    echo ".env file already exists."
fi

# ============================================================
# Step 7: Start Application with PM2
# ============================================================
echo -e "${YELLOW}[7/8] Starting Crucix with PM2...${NC}"
cd "$APP_DIR"

# Stop existing process if running
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true

# Start with PM2
pm2 start server.mjs --name "$APP_NAME"

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root

# ============================================================
# Step 8: Configure Firewall
# ============================================================
echo -e "${YELLOW}[8/8] Firewall Configuration${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Please open port $PORT in Tencent Cloud:${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "1. Go to Tencent Cloud Console"
echo "2. Navigate to: Lightstone / CVM -> Firewall"
echo "3. Add rule:"
echo "   - Type: TCP"
echo "   - Port: $PORT"
echo "   - Source: 0.0.0.0/0"
echo ""

# ============================================================
# Done
# ============================================================
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Application status:"
pm2 status
echo ""
echo "Useful commands:"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart"
echo "  pm2 stop $APP_NAME      - Stop"
echo "  pm2 monit               - Monitor"
echo ""
echo "Access your dashboard at:"
if command -v curl &> /dev/null; then
    SERVER_IP=$(curl -s ifconfig.me)
    echo "  http://$SERVER_IP:$PORT"
fi
echo ""
