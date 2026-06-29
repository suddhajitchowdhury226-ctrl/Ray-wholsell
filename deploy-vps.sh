#!/bin/bash

# Bluehost VPS Deployment Script
# Usage: ./deploy-vps.sh

set -e

echo "========================================="
echo "🚀 Bluehost VPS Deployment"
echo "========================================="
echo ""

# Configuration
BACKEND_DIR="/home/your-username/wbackend/Main-Backend"
FRONTEND_BUILD_DIR="/home/your-username/Retailer/dist"
PUBLIC_HTML="/home/your-username/public_html"
PM2_APP_NAME="rayonewholesale-api"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Backend Deployment
echo -e "${YELLOW}[1/5] Deploying Backend...${NC}"
cd $BACKEND_DIR

echo "  - Pulling latest code..."
git pull origin main || echo "  - Skipping git pull (not a git repo)"

echo "  - Installing dependencies..."
npm install --production

echo "  - Restarting PM2..."
pm2 restart $PM2_APP_NAME || pm2 start ecosystem.config.js

echo -e "${GREEN}  ✓ Backend deployed${NC}"
echo ""

# Frontend Deployment
echo -e "${YELLOW}[2/5] Deploying Frontend...${NC}"

if [ -d "$FRONTEND_BUILD_DIR" ]; then
    echo "  - Clearing public_html..."
    rm -rf $PUBLIC_HTML/*
    
    echo "  - Copying build files..."
    cp -r $FRONTEND_BUILD_DIR/* $PUBLIC_HTML/
    
    echo "  - Setting permissions..."
    chmod 644 $PUBLIC_HTML/.htaccess
    chmod 644 $PUBLIC_HTML/index.html
    chmod -R 755 $PUBLIC_HTML/assets
    
    echo -e "${GREEN}  ✓ Frontend deployed${NC}"
else
    echo -e "${RED}  ✗ Frontend build directory not found${NC}"
    echo "  Please build frontend first: npm run build"
fi
echo ""

# Verify Backend
echo -e "${YELLOW}[3/5] Verifying Backend...${NC}"
sleep 2
if curl -f http://localhost:5555/api/user/retailer-categories > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Backend is responding${NC}"
else
    echo -e "${RED}  ✗ Backend is not responding${NC}"
    echo "  Check logs: pm2 logs"
fi
echo ""

# Check PM2 Status
echo -e "${YELLOW}[4/5] PM2 Status:${NC}"
pm2 list
echo ""

# Performance Check
echo -e "${YELLOW}[5/5] Performance Check:${NC}"
echo "  Memory Usage:"
free -h | grep Mem
echo ""
echo "  PM2 Memory:"
pm2 list | grep $PM2_APP_NAME
echo ""

echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Check logs: pm2 logs"
echo "  2. Monitor: pm2 monit"
echo "  3. Test website: https://rayshealthyliving.com"
echo ""
