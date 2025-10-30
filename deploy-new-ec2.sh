#!/bin/bash

# Deploy webtorrent-livestream to new EC2 instance
# Usage: ./deploy-new-ec2.sh <EC2_IP>

if [ -z "$1" ]; then
    echo "Usage: ./deploy-new-ec2.sh <EC2_IP>"
    echo "Example: ./deploy-new-ec2.sh 18.130.161.72"
    exit 1
fi

EC2_IP=$1
KEY_PATH="/Users/ran/.ssh/bangfacetv.pem"

echo "🚀 Deploying to EC2 instance: $EC2_IP"

# Test connection
echo "Testing SSH connection..."
ssh -o StrictHostKeyChecking=no -i $KEY_PATH ubuntu@$EC2_IP "echo 'SSH connection successful'"

if [ $? -ne 0 ]; then
    echo "❌ SSH connection failed. Please check:"
    echo "1. Instance is running"
    echo "2. Security group allows SSH (port 22)"
    echo "3. Key pair is correct"
    exit 1
fi

echo "✅ SSH connection successful"

# Update system
echo "Updating system packages..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "sudo apt update && sudo apt upgrade -y"

# Install Node.js 18
echo "Installing Node.js 18..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"

# Install PM2
echo "Installing PM2..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "sudo npm install -g pm2"

# Install cloudflared
echo "Installing cloudflared..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb"

# Install Owncast
echo "Installing Owncast..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "wget https://github.com/owncast/owncast/releases/download/v0.1.1/owncast-0.1.1-linux-64bit.zip && unzip owncast-0.1.1-linux-64bit.zip && sudo mv owncast /usr/local/bin/ && sudo chmod +x /usr/local/bin/owncast"

# Create project directory
echo "Setting up project directory..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "mkdir -p /home/ubuntu/webtorrent-livestream"

# Copy project files
echo "Copying project files..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'flutter_viewer' -e "ssh -i $KEY_PATH" ./ ubuntu@$EC2_IP:/home/ubuntu/webtorrent-livestream/

# Set up environment
echo "Setting up environment..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && cat > .env << 'EOF'
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=26c042e0b8a299754cc026314bd76648
R2_SECRET_ACCESS_KEY=42f0d3b7485b82246ae523ff7f6629ca74339af39ab0fdf94ec3042895a53eba
R2_BUCKET_NAME=bangbucket
R2_UPLOAD_PATH=live/

# HTTPS Configuration
ENABLE_HTTPS=true
HTTPS_PORT=3443
WSS_PORT=3444
CERT_PATH=/home/ubuntu/webtorrent-livestream/certificates/origin.pem
KEY_PATH=/home/ubuntu/webtorrent-livestream/certificates/origin-key.pem
EOF"

# Install dependencies
echo "Installing project dependencies..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && npm install"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream/broadcaster && npm install"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream/signaling && npm install"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream/viewer && npm install"

# Set up Cloudflare tunnel
echo "Setting up Cloudflare tunnel..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "mkdir -p /home/ubuntu/.cloudflared"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cat > /home/ubuntu/.cloudflared/config.yml << 'EOF'
tunnel: 2754b35f-5fa1-43a2-86a9-fdf7227b85cc
credentials-file: /home/ubuntu/.cloudflared/2754b35f-5fa1-43a2-86a9-fdf7227b85cc.json

ingress:
  # WebSocket signaling (must be first for path matching)
  - hostname: tv.danpage.uk
    path: /ws
    service: ws://localhost:8081
  
  # Broadcaster manifest and chunks (NEW - CRITICAL FOR P2P!)
  - hostname: tv.danpage.uk
    path: /live
    service: http://localhost:3000
  
  # HLS stream from Owncast
  - hostname: tv.danpage.uk
    path: /hls
    service: http://localhost:8080
  
  # Owncast admin
  - hostname: tv.danpage.uk
    path: /admin
    service: http://localhost:8080
  
  # Main viewer site (catch-all)
  - hostname: tv.danpage.uk
    service: http://localhost:8000
  
  # 404 fallback
  - service: http_status:404
EOF"

# Start services with PM2
echo "Starting services with PM2..."
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && pm2 start ecosystem.config.js"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && pm2 start broadcaster"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && pm2 start signaling"
ssh -i $KEY_PATH ubuntu@$EC2_IP "cd /home/ubuntu/webtorrent-livestream && pm2 start tunnel"

# Save PM2 configuration
ssh -i $KEY_PATH ubuntu@$EC2_IP "pm2 save"
ssh -i $KEY_PATH ubuntu@$EC2_IP "pm2 startup"

echo "✅ Deployment complete!"
echo "Services should be running. Check with: ssh -i $KEY_PATH ubuntu@$EC2_IP 'pm2 status'"
echo "Test the live stream at: https://tv.danpage.uk/live/playlist.m3u8"
