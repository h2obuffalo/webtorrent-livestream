#!/bin/bash
# Start Owncast properly on EC2

echo "🚀 Starting Owncast on EC2..."

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "1. Checking if Owncast directory exists..."
if [ -d "~/owncast" ]; then
    echo "✅ Owncast directory found"
    cd ~/owncast
    ls -la
else
    echo "❌ Owncast directory not found"
    echo "Current directory structure:"
    ls -la ~/
    exit 1
fi

echo ""
echo "2. Checking if Owncast executable exists..."
if [ -f "./owncast" ]; then
    echo "✅ Owncast executable found"
    ./owncast --version || echo "Could not get version"
else
    echo "❌ Owncast executable not found"
    exit 1
fi

echo ""
echo "3. Copying ecosystem.config.js from webtorrent-livestream if needed..."
if [ ! -f "ecosystem.config.js" ]; then
    echo "Copying ecosystem.config.js..."
    cp ~/webtorrent-livestream/ecosystem.config.js . || echo "ecosystem.config.js not found in webtorrent-livestream"
fi

echo ""
echo "4. Starting Owncast with PM2..."
# Start only the owncast app from ecosystem config
pm2 start ecosystem.config.js --only owncast

echo ""
echo "5. Waiting 3 seconds..."
sleep 3

echo ""
echo "6. PM2 status:"
pm2 status

echo ""
echo "7. Testing Owncast API..."
curl -s http://localhost:8080/api/status | head -20 || echo "Owncast API not responding yet"

echo ""
echo "8. Owncast logs (last 10 lines):"
pm2 logs owncast --lines 10 --nostream || echo "No logs available"

EOF

echo ""
echo "✅ Owncast startup complete!"

