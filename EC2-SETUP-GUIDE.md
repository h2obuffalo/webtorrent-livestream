# EC2 Setup and Recovery Guide

## 🚨 **Critical Issue: Environment Variables Lost**

**Problem**: When the EC2 instance restarts or PM2 processes restart, environment variables are not automatically loaded into PM2 processes.

**Root Cause**: PM2 doesn't automatically load `.env` files. The broadcaster works because it uses `dotenv` at runtime, but PM2 itself doesn't see these variables.

## 🔧 **Quick Recovery Script**

Create this script to quickly restore the system after restarts:

```bash
#!/bin/bash
# EC2 Quick Recovery Script
# Run this after EC2 restarts or PM2 processes crash

echo "🚀 Starting EC2 Recovery..."

# 1. Navigate to project directory
cd /home/ubuntu/webtorrent-livestream

# 2. Ensure .env file exists with all required variables
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
mkdir -p certificates

# 4. Stop all PM2 processes
pm2 stop all

# 5. Start services in correct order
echo "🔄 Starting services..."

# Start Owncast first
pm2 start /usr/local/bin/owncast --name owncast

# Start signaling server
pm2 start signaling/server.js --name signaling

# Start broadcaster
pm2 start broadcaster/server.js --name broadcaster

# Start tunnel
pm2 start cloudflared --name tunnel -- tunnel --config /home/ubuntu/.cloudflared/config.yml run

# Start viewer
pm2 start viewer/server.js --name viewer

# 6. Save PM2 configuration
pm2 save

# 7. Setup PM2 to start on boot
pm2 startup

echo "✅ Recovery complete! Check status with: pm2 status"
```

## 📋 **Required Environment Variables**

The following environment variables must be present in `/home/ubuntu/webtorrent-livestream/.env`:

### Cloudflare R2 Configuration
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key  
- `R2_BUCKET_NAME` - R2 bucket name (bangbucket)
- `R2_UPLOAD_PATH` - Upload path (live/)
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CDN_HOSTNAME` - R2 public URL

### Owncast Configuration
- `OWNCAST_API_URL` - Owncast API URL (http://localhost:8080)
- `OWNCAST_DATA_PATH` - HLS data path (/home/ubuntu/data/hls)

### Signaling Configuration
- `SIGNALING_URL` - WebSocket URL (ws://localhost:8081)
- `WS_PORT` - WebSocket port (8081)

### HTTPS Configuration (Optional)
- `ENABLE_HTTPS` - Enable HTTPS (true)
- `HTTPS_PORT` - HTTPS port (3443)
- `WSS_PORT` - WebSocket secure port (3444)
- `CERT_PATH` - Certificate path
- `KEY_PATH` - Private key path

## 🔄 **Service Startup Order**

Services must be started in this specific order:

1. **Owncast** - HLS stream server
2. **Signaling** - WebSocket server for P2P
3. **Broadcaster** - R2 upload and P2P seeding
4. **Tunnel** - Cloudflare tunnel
5. **Viewer** - Web interface

## 🚨 **Common Issues and Solutions**

### Issue: "No value provided for input HTTP label: Bucket"
**Cause**: Missing `R2_BUCKET_NAME` environment variable
**Solution**: Ensure `.env` file contains all R2 variables

### Issue: "Unexpected token U in JSON at position 0"
**Cause**: Owncast API not accessible or wrong URL
**Solution**: Check `OWNCAST_API_URL` is correct and Owncast is running

### Issue: "bind: address already in use"
**Cause**: Port conflicts between services
**Solution**: Check which service is using the port and restart in correct order

### Issue: "Cannot find module '/home/ubuntu/owncast'"
**Cause**: Owncast binary not installed or wrong path
**Solution**: Download and install Owncast binary to `/usr/local/bin/owncast`

## 📊 **Health Checks**

After recovery, verify all services are working:

```bash
# Check PM2 status
pm2 status

# Check broadcaster logs
pm2 logs broadcaster --lines 10

# Check live manifest
curl -s https://tv.danpage.uk/live/playlist.m3u8

# Check Owncast API
curl -s http://localhost:8080/api/status
```

## 🔐 **Security Notes**

- Environment variables contain sensitive credentials
- Never commit `.env` files to version control
- Use `chmod 600 .env` to restrict access
- Consider using AWS Secrets Manager for production

## 📝 **Branch Information**

Current branch: `flutter-mobile-deadstreamfix`

This branch contains fixes for:
- Flutter mobile app dead stream issues
- R2 upload optimization
- Environment variable loading fixes
- Cloudflare tunnel configuration
