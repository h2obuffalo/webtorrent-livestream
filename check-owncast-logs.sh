#!/bin/bash
# Check Owncast logs to see why it's not starting

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "1. Checking PM2 logs for Owncast..."
pm2 logs owncast --lines 50 --nostream

echo ""
echo "2. Checking Owncast config file..."
cat ~/owncast/config.yaml 2>/dev/null | head -50 || echo "No config.yaml found"

echo ""
echo "3. Checking if port 8080 is in use..."
sudo lsof -i :8080 || netstat -tlnp | grep 8080 || ss -tlnp | grep 8080

echo ""
echo "4. Checking Owncast process details..."
pm2 describe owncast

echo ""
echo "5. Checking if Owncast data directory exists..."
ls -la ~/owncast/data/ 2>/dev/null || echo "No data directory"

EOF

