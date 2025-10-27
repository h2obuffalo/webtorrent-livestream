#!/bin/bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'
echo "=== EC2 Status Check ==="
echo ""
echo "1. Docker status:"
systemctl status docker --no-pager -l | head -20
echo ""
echo "2. Running containers:"
docker ps
echo ""
echo "3. All containers:"
docker ps -a
echo ""
echo "4. Disk space:"
df -h
echo ""
echo "5. Owncast API check:"
curl -s http://localhost:8080/api/status || echo "Owncast not responding"
echo ""
echo "6. Broadcaster health:"
curl -s http://localhost:3000/health || echo "Broadcaster not responding"
EOF

