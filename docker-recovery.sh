#!/bin/bash
# Docker Production Recovery Script
# Run this after EC2 restarts or Docker containers crash

echo "🐳 Starting Docker Production Recovery..."

# 1. Navigate to project directory
cd /home/ubuntu/webtorrent-livestream

# 2. Stop any existing containers
echo "🛑 Stopping existing containers..."
docker stop webtorrent-broadcaster-test webtorrent-signaling-test 2>/dev/null || true
docker rm webtorrent-broadcaster-test webtorrent-signaling-test 2>/dev/null || true

# 3. Ensure environment file exists
echo "📝 Creating Docker environment file..."
cat > .env.docker << 'EOF'
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=26c042e0b8a299754cc026314bd76648
R2_SECRET_ACCESS_KEY=42f0d3b7485b82246ae523ff7f6629ca74339af39ab0fdf94ec3042895a53eba
R2_BUCKET_NAME=bangbucket
R2_UPLOAD_PATH=live/

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=838041b6ff9cbae5a46f857ac4d9589c
CDN_HOSTNAME=pub-81f1de5a4fc945bdaac36449630b5685.r2.dev

# Owncast Configuration
OWNCAST_API_URL=http://localhost:8080
OWNCAST_DATA_PATH=/data/hls/0

# Signaling Configuration
SIGNALING_URL=ws://localhost:8081

# Tracker URLs
TRACKER_URLS=wss://tracker.openwebtorrent.com,wss://tracker.webtorrent.dev,wss://tracker.btorrent.xyz

# Other Configuration
CHUNK_RETENTION_MINUTES=5
ENABLE_DEBUG_LOGGING=false
OWNCAST_STATUS_CHECK_INTERVAL=10000
CHUNK_RETENTION_AFTER_END=300000
EOF

# 4. Fix directory permissions
echo "🔧 Fixing directory permissions..."
sudo chmod -R 755 /home/ubuntu/data/hls

# 5. Start signaling server first
echo "🔄 Starting signaling server..."
docker run -d --name webtorrent-signaling-test \
  --network host \
  --restart unless-stopped \
  webtorrent-livestream_signaling:latest

# 6. Wait for signaling server to start
echo "⏳ Waiting for signaling server to start..."
sleep 5

# 7. Start broadcaster
echo "🔄 Starting broadcaster..."
docker run -d --name webtorrent-broadcaster-test \
  --network host \
  --restart unless-stopped \
  -e OWNCAST_API_URL=http://localhost:8080 \
  -e R2_ACCESS_KEY_ID=26c042e0b8a299754cc026314bd76648 \
  -e R2_SECRET_ACCESS_KEY=42f0d3b7485b82246ae523ff7f6629ca74339af39ab0fdf94ec3042895a53eba \
  -e R2_BUCKET_NAME=bangbucket \
  -e CLOUDFLARE_ACCOUNT_ID=838041b6ff9cbae5a46f857ac4d9589c \
  -e CDN_HOSTNAME=pub-81f1de5a4fc945bdaac36449630b5685.r2.dev \
  -e OWNCAST_DATA_PATH=/data/hls/0 \
  -e SIGNALING_URL=ws://localhost:8081 \
  -v /home/ubuntu/data/hls:/data/hls:ro \
  webtorrent-livestream_broadcaster:latest

# 8. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# 9. Check status
echo "📊 Checking container status..."
docker ps --filter "name=webtorrent"

echo "✅ Docker recovery complete!"
echo ""
echo "🔍 To check logs:"
echo "  - Broadcaster: docker logs webtorrent-broadcaster-test --tail 20"
echo "  - Signaling: docker logs webtorrent-signaling-test --tail 20"
echo ""
echo "🌐 To test live stream: curl -s https://tv.danpage.uk/live/playlist.m3u8"
echo ""
echo "🛑 To stop services: docker stop webtorrent-broadcaster-test webtorrent-signaling-test"
