# WebTorrent Live Streaming - Deployment Guide

## AWS EC2 Deployment

This guide covers deploying the WebTorrent live streaming system to AWS EC2 for production use at venues/events with 400-1000 concurrent viewers.

---

## Table of Contents

1. [EC2 Instance Setup](#ec2-instance-setup)
2. [Owncast Installation](#owncast-installation)
3. [Project Installation](#project-installation)
4. [Cloudflare R2 Configuration](#cloudflare-r2-configuration)
5. [PM2 Process Management](#pm2-process-management)
6. [Nginx Reverse Proxy](#nginx-reverse-proxy-optional)
7. [Security Configuration](#security-configuration)
8. [OBS Configuration](#obs-configuration)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## EC2 Instance Setup

### Recommended Instance Type

For 400-1000 viewers with hybrid P2P + CDN:

- **Instance**: `t3.medium` or `t3.large`
  - t3.medium: 2 vCPUs, 4GB RAM (~$30/month)
  - t3.large: 2 vCPUs, 8GB RAM (~$60/month)
- **OS**: Ubuntu 22.04 LTS (64-bit)
- **Storage**: 30GB SSD (sufficient for live streaming with chunk cleanup)

### Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance

2. **Configure Instance**:
   - Name: `webtorrent-livestream-server`
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: t3.medium
   - Key pair: Create or select existing
   - Network: Allow SSH from your IP, HTTP/HTTPS from anywhere

3. **Configure Security Group**:

   Create security group with following rules:

   | Type | Protocol | Port | Source | Description |
   |------|----------|------|--------|-------------|
   | SSH | TCP | 22 | Your IP | SSH access |
   | HTTP | TCP | 80 | 0.0.0.0/0 | HTTP (optional nginx) |
   | HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS (optional nginx) |
   | RTMP | TCP | 1935 | Your OBS IP | RTMP input from OBS |
   | Custom TCP | TCP | 3000 | 0.0.0.0/0 | Broadcaster HTTP |
   | Custom TCP | TCP | 8080 | 0.0.0.0/0 | Signaling WebSocket |
   | Custom TCP | TCP | 5173 | 0.0.0.0/0 | Viewer (dev) |

4. **Launch Instance** and note the **Public IP address**

---

## Owncast Installation

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@<ec2-public-ip>
```

### Install Owncast

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y wget unzip

# Download Owncast (check for latest version at owncast.online)
wget https://github.com/owncast/owncast/releases/download/v0.1.2/owncast-0.1.2-linux-64bit.zip

# Extract
unzip owncast-*-linux-64bit.zip -d owncast

# Make executable
chmod +x owncast/owncast

# Test run (Ctrl+C to stop)
cd owncast
./owncast

# You should see: "Owncast is listening on port 8080"
```

### Configure Owncast

1. **Open Owncast admin** in browser: `http://<ec2-public-ip>:8080/admin`
2. **Set admin password** (first-time setup)
3. **Configure stream settings**:
   - **Stream Key**: Set a secure key (e.g., `my-secure-stream-key-123`)
   - **Server Name**: Your event/venue name
   - **Server Summary**: Description

4. **Configure video settings** (for low latency):
   - Go to **Admin → Video**
   - **Video Bitrate**: 2500 kbps
   - **Segment Length**: 4 seconds (lower = less latency)
   - **Number of Segments in Playlist**: 5
   - Save changes

---

## Project Installation

### Install Node.js

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Clone and Setup Project

```bash
# Navigate to home directory
cd ~

# Clone repository
git clone <your-repo-url> webtorrent-livestream
cd webtorrent-livestream

# Install root dependencies
npm install

# Install dependencies for all services
cd broadcaster && npm install && cd ..
cd signaling && npm install && cd ..
cd viewer && npm install && cd ..
```

### Configure Environment Variables

```bash
# Copy example config
cp .env.example .env

# Edit configuration
nano .env
```

**Update these values in `.env`**:

```bash
# Owncast path (adjust if Owncast installed elsewhere)
OWNCAST_DATA_PATH=/home/ubuntu/owncast/data/hls/0

# Cloudflare R2 credentials (get from Cloudflare dashboard)
CLOUDFLARE_ACCOUNT_ID=your_actual_account_id
R2_ACCESS_KEY_ID=your_actual_access_key
R2_SECRET_ACCESS_KEY=your_actual_secret_key
R2_BUCKET_NAME=your_bucket_name
CDN_HOSTNAME=your_bucket.r2.dev

# Keep other defaults
HTTP_PORT=3000
WS_PORT=8080
CHUNK_RETENTION_MINUTES=5
```

Save with `Ctrl+X`, `Y`, `Enter`

---

## Cloudflare R2 Configuration

### Create R2 Bucket

1. **Go to Cloudflare Dashboard** → R2 Object Storage
2. **Create Bucket**: e.g., `livestream-chunks`
3. **Configure CORS** (important for browser access):
   - Go to bucket → Settings → CORS Policy
   - Add CORS rule:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Create R2 API Token

1. **R2 Dashboard** → Manage R2 API Tokens
2. **Create API Token**:
   - Permissions: Object Read & Write
   - Bucket: Select your bucket
   - TTL: No expiry (or set as needed)
3. **Copy credentials**:
   - Access Key ID
   - Secret Access Key
   - Account ID

4. **Update `.env`** file with these credentials

### Test R2 Connection

```bash
cd ~/webtorrent-livestream

# Test R2 credentials
node -e "
require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    await s3.send(new ListBucketsCommand({}));
    console.log('✅ R2 connection successful!');
  } catch (err) {
    console.error('❌ R2 connection failed:', err.message);
  }
})();
"
```

Expected output: `✅ R2 connection successful!`

---

## PM2 Process Management

PM2 keeps your services running and automatically restarts them on crashes or server reboot.

### Install PM2

```bash
sudo npm install -g pm2
```

### Create PM2 Configuration

Create `ecosystem.config.js` in project root:

```bash
cd ~/webtorrent-livestream
nano ecosystem.config.js
```

Paste this configuration:

```javascript
module.exports = {
  apps: [
    {
      name: 'owncast',
      cwd: '/home/ubuntu/owncast',
      script: './owncast',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'broadcaster',
      cwd: '/home/ubuntu/webtorrent-livestream/broadcaster',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'signaling',
      cwd: '/home/ubuntu/webtorrent-livestream/signaling',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### Start Services with PM2

```bash
# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs broadcaster
pm2 logs signaling
pm2 logs owncast

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command that PM2 outputs (starts with 'sudo env...')
```

### PM2 Management Commands

```bash
# View all processes
pm2 list

# Stop a service
pm2 stop broadcaster

# Restart a service
pm2 restart broadcaster

# Restart all services
pm2 restart all

# View logs (live)
pm2 logs

# View logs for specific service
pm2 logs broadcaster --lines 100

# Monitor CPU/memory
pm2 monit

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all
```

---

## Nginx Reverse Proxy (Optional)

Nginx can provide:
- HTTPS/SSL termination
- Domain name routing
- Load balancing (if scaling)

### Install Nginx

```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx

Create configuration:

```bash
sudo nano /etc/nginx/sites-available/webtorrent-livestream
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Broadcaster HTTP endpoint
    location /chunks/ {
        proxy_pass http://localhost:3000/chunks/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS';
        add_header Access-Control-Expose-Headers 'Content-Length, Content-Range';
    }

    # Signaling WebSocket
    location /ws/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Viewer interface
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable configuration:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/webtorrent-livestream /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Configuration Options

#### Option 1: Cloudflare Origin Certificates (Recommended)

**Benefits:**
- ✅ **Better Cloudflare integration** - Optimized for Cloudflare's edge network
- ✅ **Long-term validity** - 15-year certificate (vs 90 days for Let's Encrypt)
- ✅ **No renewal needed** - Set and forget
- ✅ **Better performance** - Optimized for Cloudflare tunnels and CDN
- ✅ **Enhanced security** - Designed specifically for origin servers

1. **Generate Origin Certificate** in Cloudflare Dashboard:
   - Go to SSL/TLS → Origin Server
   - Create Certificate → Let Cloudflare generate a private key
   - Download both certificate and private key

2. **Place certificates** in the project:
   ```bash
   # Certificates are already placed in:
   # certificates/origin.pem (certificate)
   # certificates/origin-key.pem (private key)
   ```

3. **Enable HTTPS** in your `.env` file:
   ```bash
   ENABLE_HTTPS=true
   ```

4. **Update Cloudflare settings**:
   - Set SSL/TLS encryption mode to "Full (strict)"
   - Enable "Always Use HTTPS"
   - Configure Cloudflare Tunnels to use HTTPS origin

#### Option 2: Let's Encrypt (Alternative)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically update Nginx config for HTTPS
```

---

## Security Configuration

### Firewall Setup (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow services
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 1935/tcp   # RTMP (restrict to OBS IP if possible)
sudo ufw allow 3000/tcp   # Broadcaster HTTP
sudo ufw allow 8080/tcp   # Signaling WebSocket

# Check status
sudo ufw status
```

### Restrict RTMP to OBS IP (Recommended)

```bash
# Replace 203.0.113.50 with your OBS machine's public IP
sudo ufw delete allow 1935/tcp
sudo ufw allow from 203.0.113.50 to any port 1935 proto tcp
```

### Set Stream Key in Owncast

Use a strong, unique stream key in Owncast admin panel to prevent unauthorized streaming.

---

## OBS Configuration

### Configure OBS for Remote Streaming

1. **Open OBS Studio** (on your streaming machine)

2. **Settings → Stream**:
   - Service: **Custom**
   - Server: `rtmp://<ec2-public-ip>:1935`
   - Stream Key: `your-owncast-stream-key` (from Owncast admin)

3. **Settings → Output**:
   - Output Mode: **Advanced**
   - **Streaming Tab**:
     - Encoder: x264 (or Hardware if available)
     - Bitrate: 2500 Kbps
     - Keyframe Interval: 2 seconds
     - CPU Usage Preset: veryfast
     - Profile: high

4. **Settings → Video**:
   - Base Resolution: 1920x1080
   - Output Resolution: 1920x1080 (or 1280x720 for lower bandwidth)
   - FPS: 30 (or 60 for sports/action)

5. **Test Connection**: Click "Start Streaming" and verify in Owncast admin

---

## Monitoring & Maintenance

### Health Check Endpoints

```bash
# Broadcaster health
curl http://localhost:3000/health

# Example response:
# {"status":"ok","torrents":3,"peers":12,"chunks":25,"signaling":"connected"}

# Broadcaster metrics
curl http://localhost:3000/metrics
```

### Monitoring Commands

```bash
# Monitor PM2 processes
pm2 monit

# View service logs
pm2 logs --lines 50

# Check disk space
df -h

# Check CPU/memory
htop  # or: top

# Monitor network traffic
sudo iftop -i eth0

# Check open connections
netstat -an | grep -E "3000|8080|1935"

# Monitor Owncast
curl http://localhost:8080/api/status | jq .
```

### Log Rotation

PM2 handles log rotation automatically. Configure in `ecosystem.config.js`:

```javascript
{
  ...
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  error_file: '/home/ubuntu/.pm2/logs/broadcaster-error.log',
  out_file: '/home/ubuntu/.pm2/logs/broadcaster-out.log',
  merge_logs: true,
  max_memory_restart: '500M',
}
```

### Cleanup Old R2 Chunks (Optional)

The broadcaster automatically stops seeding old chunks, but they remain in R2. To reduce storage costs, set up a lifecycle policy in Cloudflare R2:

1. **R2 Dashboard** → Your Bucket → Settings → Lifecycle Rules
2. **Add Rule**:
   - Delete objects older than: 7 days
   - Prefix: `live/`

---

## Troubleshooting

### Service Won't Start

```bash
# Check PM2 logs
pm2 logs broadcaster --err --lines 50

# Common issues:
# 1. Port already in use
sudo netstat -tulpn | grep :3000

# 2. Missing .env file
ls -la ~/webtorrent-livestream/.env

# 3. Wrong file paths in .env
cat ~/webtorrent-livestream/.env
```

### OBS Connection Refused

```bash
# Check if Owncast is running
pm2 status owncast

# Check if port 1935 is listening
sudo netstat -tulpn | grep 1935

# Check firewall
sudo ufw status | grep 1935

# Test RTMP port from OBS machine
telnet <ec2-ip> 1935
```

### No Chunks Being Created

```bash
# Check if OBS is connected
curl http://localhost:8080/api/status | jq .online

# Should return: true

# Check Owncast HLS directory
ls -lht ~/owncast/data/hls/0/ | head -20

# Should show recent .ts files

# Check broadcaster logs
pm2 logs broadcaster
```

### Viewers Not Connecting

```bash
# Test WebSocket signaling
wscat -c ws://<ec2-public-ip>:8080

# Should connect and receive messages

# Check firewall
sudo ufw status | grep 8080

# Check if signaling server is running
pm2 status signaling
```

### Zero P2P Peers

This is expected behavior in some scenarios:
- Viewers on different networks (not same LAN)
- Network blocking WebRTC ports
- Firewall/NAT restrictions

**Solution**: HTTP fallback should activate automatically. Verify in viewer browser console.

### High CPU Usage

```bash
# Check which process is using CPU
htop

# If Owncast is high:
# - Lower video bitrate in Owncast settings
# - Reduce output resolution
# - Use faster encoding preset

# If broadcaster is high:
# - Increase CHUNK_RETENTION_MINUTES to reduce seeding overhead
# - Check for memory leaks: pm2 logs broadcaster
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Find large files
sudo du -sh /home/ubuntu/* | sort -rh | head -10

# Clean old Owncast segments (if not auto-cleaning)
find ~/owncast/data/hls/0/ -name "*.ts" -mmin +60 -delete

# Clean PM2 logs
pm2 flush
```

---

## Backup & Disaster Recovery

### Backup .env File

```bash
# Download .env to local machine (keep secure!)
scp -i your-key.pem ubuntu@<ec2-ip>:/home/ubuntu/webtorrent-livestream/.env ~/backup/.env.backup
```

### Create AMI Snapshot (AWS)

1. **EC2 Console** → Instances → Select your instance
2. **Actions → Image and templates → Create image**
3. Use this AMI to quickly restore or launch additional instances

---

## Performance Tuning

### For Higher Viewer Counts (1000+)

- **Upgrade instance**: t3.large or c5.large
- **Increase chunk retention**: Keep more chunks seeded for P2P
- **Use multiple R2 buckets**: Distribute load across regions
- **Enable CloudFlare CDN**: Use Cloudflare in front of R2 for faster global delivery

### Network Optimization

```bash
# Increase network buffer sizes (requires sudo)
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv4.tcp_rmem='4096 87380 16777216'
sudo sysctl -w net.ipv4.tcp_wmem='4096 65536 16777216'

# Make permanent
echo "net.core.rmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Cost Estimation

### AWS EC2 (t3.medium)
- Instance: ~$30/month
- Data transfer: ~$9/GB (first 100GB free)
- Storage: ~$1/month for 30GB

### Cloudflare R2
- Storage: $0.015/GB/month
- Operations: $0.36/million Class A, $0.036/million Class B
- Egress: **FREE** (major advantage over S3)

**Example for 2-hour event with 1000 viewers:**
- Storage: ~1GB = $0.015
- Egress: ~500GB = **$0** (R2 has no egress fees)
- EC2 data transfer: ~5GB = $0.45
- **Total**: ~$0.50 per event (plus monthly EC2 costs)

---

## Next Steps

1. **Test end-to-end** with OBS streaming and multiple viewers
2. **Monitor performance** during a test stream
3. **Document venue-specific settings** (IP addresses, stream keys, etc.)
4. **Create runbook** for event day operations
5. **Schedule regular backups** of configuration

---

**Questions?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue.

**Deployment Checklist**: Use [deployment-checklist.md](./deployment-checklist.md) for step-by-step verification.

