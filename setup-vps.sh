# Bluehost VPS Quick Setup Script
# Run this on your VPS after uploading files

echo "========================================="
echo "Bluehost VPS Optimization Setup"
echo "========================================="
echo ""

# Step 1: Install PM2
echo "[1/6] Installing PM2..."
npm install -g pm2
echo "✓ PM2 installed"
echo ""

# Step 2: Install Backend Dependencies
echo "[2/6] Installing backend dependencies..."
cd /home/your-username/wbackend/Main-Backend
npm install compression --save
npm install --production
echo "✓ Backend dependencies installed"
echo ""

# Step 3: Create logs directory
echo "[3/6] Creating logs directory..."
mkdir -p logs
echo "✓ Logs directory created"
echo ""

# Step 4: Enable Apache modules
echo "[4/6] Enabling Apache modules..."
sudo a2enmod deflate 2>/dev/null || echo "  deflate already enabled"
sudo a2enmod expires 2>/dev/null || echo "  expires already enabled"
sudo a2enmod headers 2>/dev/null || echo "  headers already enabled"
sudo a2enmod rewrite 2>/dev/null || echo "  rewrite already enabled"
sudo a2enmod proxy 2>/dev/null || echo "  proxy already enabled"
sudo a2enmod proxy_http 2>/dev/null || echo "  proxy_http already enabled"
echo "✓ Apache modules enabled"
echo ""

# Step 5: Start Backend with PM2
echo "[5/6] Starting backend with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup
echo "✓ Backend started"
echo ""

# Step 6: Verify
echo "[6/6] Verifying installation..."
pm2 status
echo ""

echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Upload frontend build to public_html"
echo "  2. Ensure .htaccess is in public_html"
echo "  3. Test: curl http://localhost:5555/api/user/retailer-categories"
echo "  4. Restart Apache: sudo systemctl restart apache2"
echo ""
echo "Useful commands:"
echo "  pm2 status    - Check backend status"
echo "  pm2 logs      - View logs"
echo "  pm2 monit     - Monitor resources"
echo "  pm2 restart rayonewholesale-api - Restart backend"
echo ""
