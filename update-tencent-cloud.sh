#!/bin/bash
# ============================================
# Crucix Update Script for Tencent Cloud
# ============================================
# Usage: ./update-tencent-cloud.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/opt/crucix"
APP_NAME="crucix"

echo -e "${YELLOW}Updating Crucix...${NC}"

# Pull latest changes
cd "$APP_DIR"
git pull origin $(git rev-parse --abbrev-ref HEAD)

# Install dependencies
npm install

# Restart application
pm2 restart "$APP_NAME"

echo -e "${GREEN}Update complete!${NC}"
pm2 status
