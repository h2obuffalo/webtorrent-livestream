#!/bin/bash
# Fix Owncast permissions on EC2

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "🔧 Fixing Owncast permissions..."

# Stop Owncast first
echo "1. Stopping Owncast..."
pm2 stop owncast || echo "Owncast not running"

echo ""
echo "2. Checking ownership of data directory..."
ls -la ~/owncast/data/hls/ | head -10

echo ""
echo "3. Fixing permissions on data/hls directory..."
sudo chown -R ubuntu:ubuntu ~/owncast/data/
chmod -R 755 ~/owncast/data/

echo ""
echo "4. Checking ownership after fix..."
ls -la ~/owncast/data/hls/ | head -10

echo ""
echo "5. Attempting to remove the problematic file..."
rm -f ~/owncast/data/hls/0/stream-iodLKBgvgm-165.ts || echo "File removed or doesn't exist"

echo ""
echo "6. Cleaning up old HLS files..."
rm -rf ~/owncast/data/hls/0/*.ts

echo ""
echo "7. Starting Owncast..."
pm2 start ecosystem.config.js --only owncast

echo ""
echo "8. Waiting 3 seconds..."
sleep 3

echo ""
echo "9. Checking PM2 status..."
pm2 status

echo ""
echo "10. Testing Owncast API..."
curl -s http://localhost:8080/api/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/api/status || echo "Still not responding"

EOF

echo ""
echo "✅ Done! Try accessing the Owncast admin panel now."

