# WebTorrent Live Streaming POC

A low-latency live streaming system using WebTorrent for P2P distribution over LAN, with HTTP/CDN fallback for network restrictions. Optimized for 400-1000 concurrent viewers at venues/events.

## Architecture

```
OBS Studio → Owncast (RTMP ingestion + HLS encoding)
    ↓
Broadcaster Service (Node.js)
    ├── Monitor Owncast HLS output
    ├── Seed segments via WebTorrent (P2P)
    ├── Upload segments to Cloudflare R2 (HTTP fallback)
    └── Notify Signaling Server
           ↓
    Signaling Server (WebSocket)
           ↓
    PWA Viewer (Browser)
        ├── Try P2P first (WebTorrent)
        └── Fallback to R2 (HTTP) if P2P blocked
```

## Features

- **Hybrid P2P + CDN**: Maximize LAN bandwidth efficiency, fallback to cloud when needed
- **Low Latency**: 30-60 second target latency
- **Cross-Platform**: Works on Chrome, Firefox, Safari, Android, iOS, Android TV, Fire TV
- **Automatic Fallback**: Seamlessly switches from P2P to HTTP when network restricts P2P
- **Scalable**: Designed for 400-1000 concurrent viewers
- **Easy Setup**: Uses Owncast for encoding, simple Node.js services

## Prerequisites

- **Node.js** 16+ and npm
- **Owncast** ([Download](https://owncast.online)) - handles video encoding
- **OBS Studio** - for streaming input
- **Cloudflare R2** account - for HTTP fallback CDN
- **AWS EC2** (optional) - for deployment

## Quick Start

### 1. Install Owncast

```bash
# Download Owncast for your platform
# https://owncast.online/download

# Extract and run
cd owncast
./owncast

# Open admin panel: http://localhost:8080/admin
# Set stream key, configure quality settings
```

### 2. Clone and Setup Project

```bash
git clone <repo-url>
cd webtorrent-livestream

# Copy environment config
cp .env.example .env

# Edit .env with your Cloudflare R2 credentials
nano .env

# Install dependencies for all services
npm install
cd broadcaster && npm install && cd ..
cd signaling && npm install && cd ..
cd viewer && npm install && cd ..
```

### 3. Configure OBS

1. Open OBS Studio
2. **Settings → Stream**
   - Service: **Custom**
   - Server: `rtmp://localhost:1935`
   - Stream Key: `abc123` (match Owncast admin setting)
3. **Settings → Output**
   - Output Mode: **Advanced**
   - Bitrate: **2500 Kbps** (adjust for your upload speed)
   - Keyframe Interval: **2** seconds
   - Preset: **veryfast**
   - Profile: **high**

### 4. Start Services

```bash
# Terminal 1: Start Owncast (if not already running)
cd owncast && ./owncast

# Terminal 2: Start Broadcaster
cd broadcaster && npm start

# Terminal 3: Start Signaling Server
cd signaling && npm start

# Terminal 4: Start Viewer (dev server)
cd viewer && npm start
```

### 5. Start Streaming

1. In OBS, click **Start Streaming**
2. Verify in Owncast admin: http://localhost:8080/admin (should show "Live")
3. Open viewer: http://localhost:5173 (or viewer dev server URL)
4. Open multiple browser windows to test P2P peer connections

## Project Structure

```
webtorrent-livestream/
├── broadcaster/          # Monitors Owncast, seeds P2P, uploads to R2
│   ├── server.js        # Main broadcaster service
│   ├── r2-uploader.js   # Cloudflare R2 upload handler
│   └── package.json
├── signaling/           # WebSocket server for magnet distribution
│   ├── server.js        # WebSocket signaling server
│   └── package.json
├── viewer/              # Progressive Web App viewer
│   ├── public/          # Static assets
│   ├── src/             # React/Vue components
│   │   ├── player.js    # WebTorrent + MSE playback logic
│   │   └── App.js       # Main viewer UI
│   └── package.json
├── shared/              # Shared utilities and types
│   └── message-types.js # WebSocket message formats
├── docs/                # Documentation
│   ├── DEVELOPMENT_GUIDELINES.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
├── .env.example         # Environment variable template
└── README.md           # This file
```

## Testing

### Test P2P Connectivity

Open browser console on viewer page:

```javascript
// Check peer count
console.log('Torrents:', client.torrents.length);
console.log('Peers per torrent:', client.torrents.map(t => `${t.name}: ${t.numPeers} peers`));

// Monitor download
client.on('download', (bytes) => {
  console.log('Downloaded:', bytes, 'bytes via P2P');
});
```

### Test HTTP Fallback

Block WebTorrent ports to force HTTP fallback:

```bash
# macOS/Linux - block BitTorrent ports
sudo pfctl -e
echo "block drop proto {tcp udp} from any to any port 6881:6889" | sudo pfctl -f -

# Test viewer - should show "Using HTTP fallback"
```

### Test on Different Platforms

1. **Desktop Chrome**: Should use P2P
2. **Desktop Safari**: May use HTTP fallback (limited WebRTC)
3. **Android Chrome**: Should use P2P on same WiFi
4. **iOS Safari**: Likely HTTP fallback
5. **Android TV**: Use adb for debugging: `adb logcat browser:V *:S`
6. **Fire TV**: Likely HTTP fallback (Silk browser limitations)

## Deployment (AWS EC2)

### Launch EC2 Instance

```bash
# t3.medium recommended for 1000 viewers
# 2 vCPUs, 4GB RAM
# Ubuntu 22.04 LTS

# Security Group ports:
# - 1935 (RTMP from OBS)
# - 3000 (Broadcaster HTTP)
# - 8080 (Signaling WebSocket)
# - 80/443 (Optional: nginx reverse proxy)
```

### Install on EC2

```bash
# SSH into EC2
ssh ubuntu@<ec2-ip>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Owncast
wget https://github.com/owncast/owncast/releases/download/v0.1.2/owncast-0.1.2-linux-64bit.zip
unzip owncast-*-linux-64bit.zip
cd owncast

# Clone project
cd ~
git clone <repo-url>
cd webtorrent-livestream

# Setup .env with production values
cp .env.example .env
nano .env

# Install PM2 for process management
sudo npm install -g pm2

# Start services with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Configuration

### Owncast Settings

Recommended Owncast configuration for low latency:

- **Video Bitrate**: 2500 kbps
- **Audio Bitrate**: 128 kbps
- **Segment Length**: 2-4 seconds (shorter = lower latency, higher overhead)
- **Number of Segments**: 3-5
- **Stream Output Variants**: Single quality (or multi-quality for adaptive)

### Chunk Duration

Configured in Owncast (default 4 seconds). Trade-offs:

- **Shorter (1-2s)**: Lower latency, more overhead, more torrents
- **Longer (10-20s)**: Higher latency, less overhead, fewer torrents
- **Recommended**: 4-6 seconds for 30-60s target latency

### R2 Storage Costs

With 1000 viewers for 2 hours:

- Fallback usage: ~10% (if P2P works)
- Chunk size: ~500KB per 4s chunk (estimate)
- Total chunks: 1800 chunks (2 hours)
- Storage: ~900MB
- Egress (100 viewers fallback): ~90GB
- **Cost**: ~$0.90 (R2 egress free tier covers most of this)

## Monitoring

Access metrics:

- **Owncast Admin**: http://localhost:8080/admin - viewer count, bandwidth
- **Broadcaster Logs**: Check chunk seeding, R2 uploads, errors
- **Signaling Server**: WebSocket connection count
- **Viewer Console**: P2P peer count, download stats

## Troubleshooting

### Zero Peers Despite Multiple Viewers

**Cause**: Network blocking P2P (AP isolation, port restrictions)

**Solution**:
1. Verify all viewers on same network
2. Test port connectivity: `nc -v broadcaster-ip 6881`
3. Check venue WiFi settings (disable AP isolation if possible)
4. HTTP fallback should activate automatically

### Video Buffering/Stuttering

**Cause**: Insufficient bandwidth or buffer management issues

**Solution**:
1. Lower Owncast bitrate (try 1500 kbps)
2. Reduce chunk size in Owncast (try 2s segments)
3. Check browser console for MSE errors
4. Verify R2 CDN is accessible

### Owncast Not Creating Segments

**Cause**: OBS not connected or Owncast misconfigured

**Solution**:
```bash
# Check if Owncast is receiving stream
curl http://localhost:8080/api/status | jq .online

# Verify HLS directory
ls -lh owncast/data/hls/0/

# Check Owncast logs
tail -f owncast/data/logs/owncast.log
```

### R2 Upload Failures

**Cause**: Invalid credentials or network issues

**Solution**:
```bash
# Test R2 credentials
node -e "require('dotenv').config(); const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3'); const s3 = new S3Client({ region: 'auto', endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }); (async () => { try { await s3.send(new ListBucketsCommand({})); console.log('✅ R2 credentials valid'); } catch (e) { console.log('❌ R2 error:', e.message); } })();"
```

## Performance Tips

1. **Use wired Ethernet** for broadcaster/Owncast server
2. **Run local tracker** on venue network for faster peer discovery
3. **Pre-test venue network** for P2P compatibility
4. **Monitor CPU usage** on Owncast (encoding is CPU-intensive)
5. **Use CDN edge location** close to venue (Cloudflare auto-routes)

## Documentation

- [Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md) - Coding standards, testing protocols
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions

## License

MIT License - See LICENSE file for details

## Contributing

See [DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md) for development workflow and testing requirements.

## Support

- Open an issue for bugs/feature requests
- Check existing issues before creating new ones
- Include platform, browser version, and error logs in bug reports

