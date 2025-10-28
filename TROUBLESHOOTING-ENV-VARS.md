# Environment Variables Troubleshooting Guide

## 🚨 **The Problem: Why Environment Variables Were Lost**

### Root Cause Analysis

1. **PM2 doesn't load .env files automatically**
   - PM2 processes don't inherit environment variables from `.env` files
   - The broadcaster works because it uses `require('dotenv').config()` at runtime
   - But PM2 itself doesn't see these variables

2. **EC2 instance restarts**
   - When EC2 restarts, PM2 processes restart
   - Environment variables are not persisted across restarts
   - The `.env` file exists but PM2 doesn't load it

3. **Missing PM2 ecosystem configuration**
   - No centralized configuration for all services
   - Each service started individually without proper env loading

## 🔧 **Solutions Implemented**

### 1. Recovery Script (`ec2-recovery.sh`)
- Automatically recreates `.env` file with all required variables
- Starts services in correct order
- Saves PM2 configuration for persistence

### 2. PM2 Ecosystem Configuration (`ecosystem.config.js`)
- Centralized configuration for all services
- Proper environment variable loading with `env_file: './.env'`
- Automatic restart policies and error handling

### 3. Comprehensive Documentation (`EC2-SETUP-GUIDE.md`)
- Step-by-step recovery procedures
- Common issues and solutions
- Health check commands

## 📋 **Environment Variables That Were Missing**

During the troubleshooting, we discovered these critical variables were missing:

```bash
# These were missing and caused failures:
CLOUDFLARE_ACCOUNT_ID=838041b6ff9cbae5a46f857ac4d9589c
OWNCAST_DATA_PATH=/home/ubuntu/data/hls
CDN_HOSTNAME=pub-81f1de5a4fc945bdaac36449630b5685.r2.dev
WS_PORT=8081
```

## 🔍 **How to Diagnose Environment Variable Issues**

### 1. Check PM2 Environment
```bash
pm2 env <process_id>
```

### 2. Check .env File
```bash
cat /home/ubuntu/webtorrent-livestream/.env
```

### 3. Check Service Logs
```bash
pm2 logs broadcaster --lines 20
```

### 4. Test Environment Loading
```bash
cd /home/ubuntu/webtorrent-livestream
node -e "require('dotenv').config(); console.log(process.env.R2_BUCKET_NAME)"
```

## 🚀 **Prevention Strategies**

### 1. Use PM2 Ecosystem Configuration
Instead of starting services individually:
```bash
# OLD WAY (prone to env issues)
pm2 start broadcaster/server.js --name broadcaster

# NEW WAY (with proper env loading)
pm2 start ecosystem.config.js
```

### 2. Create Startup Script
Add to EC2 user data or startup script:
```bash
#!/bin/bash
cd /home/ubuntu/webtorrent-livestream
pm2 start ecosystem.config.js
pm2 save
```

### 3. Monitor Environment Variables
Regular health checks:
```bash
# Check if all required vars are loaded
pm2 exec broadcaster "node -e \"require('dotenv').config(); console.log('R2_BUCKET:', process.env.R2_BUCKET_NAME)\""
```

## 🔄 **Recovery Procedures**

### Quick Recovery (5 minutes)
```bash
cd /home/ubuntu/webtorrent-livestream
./ec2-recovery.sh
```

### Manual Recovery
```bash
# 1. Stop all services
pm2 stop all

# 2. Ensure .env file exists
cat > .env << 'EOF'
# [paste all environment variables]
EOF

# 3. Start with ecosystem config
pm2 start ecosystem.config.js

# 4. Save configuration
pm2 save
```

### Full System Recovery
```bash
# 1. Download latest code
git pull origin flutter-mobile-deadstreamfix

# 2. Install dependencies
npm install

# 3. Run recovery script
./ec2-recovery.sh

# 4. Verify all services
pm2 status
curl -s https://tv.danpage.uk/live/playlist.m3u8
```

## 📊 **Health Check Commands**

```bash
# Check PM2 status
pm2 status

# Check specific service logs
pm2 logs broadcaster --lines 10

# Test live stream
curl -s https://tv.danpage.uk/live/playlist.m3u8

# Test Owncast API
curl -s http://localhost:8080/api/status

# Check R2 uploads
pm2 logs broadcaster | grep "R2 upload complete"

# Check WebTorrent seeding
pm2 logs broadcaster | grep "Seeding"
```

## 🎯 **Key Lessons Learned**

1. **PM2 doesn't load .env files automatically** - Use ecosystem config
2. **Environment variables are critical** - Missing vars cause silent failures
3. **Service startup order matters** - Owncast must start before broadcaster
4. **Recovery scripts are essential** - Manual recovery is error-prone
5. **Documentation prevents future issues** - Clear procedures save time

## 🔐 **Security Considerations**

- Environment variables contain sensitive credentials
- Never commit `.env` files to version control
- Use `chmod 600 .env` to restrict access
- Consider using AWS Secrets Manager for production
- Rotate credentials regularly

## 📝 **Next Steps**

1. Deploy the recovery script to EC2
2. Test the ecosystem configuration
3. Set up automated health checks
4. Create monitoring alerts for environment issues
5. Document any additional environment variables as they're added
