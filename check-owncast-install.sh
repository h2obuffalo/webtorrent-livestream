#!/bin/bash
# Check Owncast installation on EC2

ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 << 'EOF'

echo "1. Checking for Owncast in common locations..."
echo "Checking ~/owncast:"
ls -la ~/owncast 2>/dev/null || echo "❌ ~/owncast not found"

echo ""
echo "Checking /opt/owncast:"
ls -la /opt/owncast 2>/dev/null || echo "❌ /opt/owncast not found"

echo ""
echo "Searching for owncast binary:"
which owncast 2>/dev/null || echo "❌ owncast not in PATH"

echo ""
echo "Searching for owncast executable:"
find ~ -name "owncast" -type f 2>/dev/null | head -5

echo ""
echo "2. Checking if Owncast was installed via package manager:"
dpkg -l | grep -i owncast || echo "Not found in dpkg"

echo ""
echo "3. Checking for Docker Owncast image:"
docker images | grep -i owncast || echo "No Owncast Docker image"

echo ""
echo "4. Checking current directory structure:"
ls -la ~/

echo ""
echo "5. Checking if owncast was built from source:"
ls -la ~/go/src/github.com/owncast/owncast 2>/dev/null || echo "Not found in Go src"

EOF

