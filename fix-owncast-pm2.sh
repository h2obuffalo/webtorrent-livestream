#!/bin/bash
# Fix Owncast PM2 service on EC2

echo "🔍 Checking Owncast PM2 status..."

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "1. Checking PM2 status..."
pm2 status

echo ""
echo "2. Checking Owncast process..."
pm2 describe owncast || echo "Owncast not found in PM2"

echo ""
echo "3. Attempting to start/restart Owncast..."
cd ~/owncast

# Check if Owncast executable exists
if [ -f "./owncast" ]; then
    echo "✅ Owncast executable found"
    
    # Start Owncast with PM2
    pm2 start ecosystem.config.js --only owncast || pm2 restart owncast || echo "Failed to start Owncast"
else
    echo "❌ Owncast executable not found at ~/owncast/owncast"
    echo "Listing ~/owncast directory:"
    ls -la ~/owncast/
fi

echo ""
echo "4. Waiting 3 seconds and checking status..."
sleep 3
pm2 status

echo ""
echo "5. Testing Owncast API..."
curl -s http://localhost:8080/api/status || echo "Owncast API not responding"

echo ""
echo "6. Checking Owncast logs..."
pm2 logs owncast --lines 10 --nostream

EOF

echo ""
echo "✅ Owncast PM2 check complete!"

