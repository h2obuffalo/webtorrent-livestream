#!/bin/bash

echo "=== EC2 Owncast Diagnostic Script ==="
echo ""

echo "1. Checking Docker status..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "systemctl status docker --no-pager -l"

echo ""
echo "2. Checking running containers..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker ps -a"

echo ""
echo "3. Checking Docker Compose services..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && docker compose ps"

echo ""
echo "4. Checking Owncast container logs (last 50 lines)..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker logs owncast --tail 50 2>&1 || echo 'Owncast container not found'"

echo ""
echo "5. Checking disk space..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "df -h"

echo ""
echo "6. Checking if Owncast HTTP port is listening..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "netstat -tlnp | grep 8080 || ss -tlnp | grep 8080 || echo 'Port 8080 not found'"

echo ""
echo "7. Checking Owncast API..."
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "curl -s http://localhost:8080/api/status || echo 'Owncast API not responding'"

echo ""
echo "=== Diagnostic Complete ==="

