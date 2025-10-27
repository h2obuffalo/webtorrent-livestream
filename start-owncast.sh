#!/bin/bash
# Start Owncast on EC2

echo "Starting Owncast container..."

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'
cd ~/webtorrent-livestream

# Check if Owncast is defined in docker-compose
if docker compose ps owncast 2>/dev/null | grep -q owncast; then
    echo "Starting Existing Owncast container..."
    docker compose up -d owncast
else
    echo "Owncast not found in docker-compose.yml"
    echo "Checking if Owncast container exists standalone..."
    
    if docker ps -a | grep -q owncast; then
        echo "Starting existing Owncast container..."
        docker start owncast
    else
        echo "❌ Owncast container not found"
        echo "Available containers:"
        docker ps -a
    fi
fi

# Wait a moment and check status
sleep 2
echo ""
echo "Docker container status:"
docker ps | grep -E "OWNCAST|owncast|webtorrent"

echo ""
echo "Testing Owncast API..."
sleep 2
curl -s http://localhost:8080/api/status || echo "Owncast API not responding yet"

EOF

echo ""
echo "Owncast startup complete!"

