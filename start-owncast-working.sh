#!/bin/bash
# Start Owncast on EC2 from the correct location

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "🚀 Starting Owncast on EC2..."
echo ""

cd ~/owncast

echo "1. Checking Owncast executable..."
ls -la owncast

echo ""
echo "2. Getting Owncast version..."
./owncast --version || ./owncast version || echo "Could not get version"

echo ""
echo "3. Copying ecosystem.config.js..."
cp ~/webtorrent-livestream/ecosystem.config.js . || echo "Failed to copy ecosystem.config.js"

echo ""
echo "4. Starting Owncast with PM2..."
pm2 start ecosystem.config.js --only owncast

echo ""
echo "5. Waiting 3 seconds..."
sleep 3

echo ""
echo "6. PM2 status:"
pm2 status

echo ""
echo "7. Testing Owncast API..."
curl -s http://localhost:8080/api/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/api/status || echo "Owncast not responding"

echo ""
echo "8. Owncast logs (last 15 lines):"
pm2 logs owncast --lines 15 --nostream || echo "No logs available"

echo ""
echo "✅ Done! Owncast should now be running."

EOF

