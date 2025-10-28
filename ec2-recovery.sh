#!/bin/bash
# EC2 Quick Recovery Script
# Run this after EC2 restarts or PM2 processes crash

echo "🚀 Starting EC2 Recovery..."

# 1. Navigate to project directory
cd /home/ubuntu/webtorrent-livestream

# 2. Ensure .env file exists with all required variables
echo "📝 Creating .env file..."
cat > .env << 'EOF'
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

# Owncast Configuration
OWNCAST_API_URL=http://localhost:8080
OWNCAST_DATA_PATH=/home/ubuntu/data/hls

# Signaling Configuration
SIGNALING_URL=ws://localhost:8081
WS_PORT=8081

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=838041b6ff9cbae5a46f857ac4d9589c
CDN_HOSTNAME=pub-81f1de5a4fc945bdaac36449630b5685.r2.dev
EOF

# 3. Create certificates directory if it doesn't exist
echo "📁 Creating certificates directory..."
mkdir -p certificates

# 4. Stop all PM2 processes
echo "🛑 Stopping all PM2 processes..."
pm2 stop all

# 5. Start services in correct order
echo "🔄 Starting services..."

# Start Owncast first
echo "  - Starting Owncast..."
pm2 start /usr/local/bin/owncast --name owncast

# Start signaling server
echo "  - Starting signaling server..."
pm2 start signaling/server.js --name signaling

# Start broadcaster
echo "  - Starting broadcaster..."
pm2 start broadcaster/server.js --name broadcaster

# Start tunnel
echo "  - Starting Cloudflare tunnel..."
pm2 start cloudflared --name tunnel -- tunnel --config /home/ubuntu/.cloudflared/config.yml run

# Start viewer
echo "  - Starting viewer..."
pm2 start viewer/server.js --name viewer

# 6. Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# 7. Setup PM2 to start on boot
echo "🔧 Setting up PM2 startup..."
pm2 startup

echo "✅ Recovery complete!"
echo ""
echo "📊 Checking service status..."
pm2 status
echo ""
echo "🔍 To check logs: pm2 logs broadcaster --lines 10"
echo "🌐 To test live stream: curl -s https://tv.danpage.uk/live/playlist.m3u8"
