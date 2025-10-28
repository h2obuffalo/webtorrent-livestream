# EC2 Recovery Guide - Quick Fixes

## 🚨 HTML Redirect Issue (FIXED)

### Problem
- `tv.danpage.uk/test-p2p-branded.html` redirects to `tv.danpage.uk/test-p2p-branded` (404)
- All `.html` files get redirected to non-`.html` URLs

### Root Cause
Using `serve` package instead of Vite preview. The `serve` package strips `.html` extensions by default.

### Quick Fix (2 minutes)

```bash
# 1. SSH into EC2
ssh -i ~/.ssh/bangfacetv.pem ubuntu@13.40.168.129

# 2. Kill any existing serve/http-server processes
pkill -f 'serve -s viewer/public'
pkill -f 'http-server'

# 3. Start Vite preview (correct tool)
cd /home/ubuntu/webtorrent-livestream/viewer
nohup npm run preview -- --port 8000 --host 0.0.0.0 > /tmp/vite-preview.log 2>&1 &

# 4. Verify fix
curl -I https://tv.danpage.uk/test-p2p-branded.html
# Should return: HTTP/2 200 (not 301 redirect)
```

### Why This Happened
The system was originally designed to use **Vite preview** (as documented in `package.json`), but someone switched to using the `serve` package. 

- ✅ **Vite preview**: Designed for web applications, preserves file extensions
- ❌ **serve package**: Designed for simple static files, strips `.html` extensions by default

### Prevention
Always use Vite preview for the viewer service:
- **Development**: `npm run dev` (port 5173)
- **Production**: `npm run preview -- --port 8000 --host 0.0.0.0`

---

## 🔧 Service Management

### Check All Services
```bash
# Check what's running
ps aux | grep -E '(owncast|broadcaster|signaling|vite|serve)'

# Check ports
ss -tlnp | grep -E ':(3000|8000|8080|8081)'
```

### Restart Services
```bash
# Restart all PM2 services
pm2 restart all

# Restart viewer (if not in PM2)
cd /home/ubuntu/webtorrent-livestream/viewer
pkill -f vite
nohup npm run preview -- --port 8000 --host 0.0.0.0 > /tmp/vite-preview.log 2>&1 &
```

### View Logs
```bash
# PM2 logs
pm2 logs

# Vite preview logs
tail -f /tmp/vite-preview.log

# Serve logs (if still using)
tail -f /tmp/serve.log
```

---

## 📋 Correct Production Setup

### Services Running
1. **Owncast** (PM2): Port 8080
2. **Broadcaster** (PM2): Port 3000  
3. **Signaling** (PM2): Port 8081
4. **Viewer** (Vite preview): Port 8000
5. **Cloudflare Tunnel**: Routes `tv.danpage.uk` to services

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'owncast',
      cwd: '/home/ubuntu/owncast',
      script: './owncast',
      // ... existing config
    },
    {
      name: 'broadcaster', 
      cwd: '/home/ubuntu/webtorrent-livestream/broadcaster',
      script: 'server.js',
      // ... existing config
    },
    {
      name: 'signaling',
      cwd: '/home/ubuntu/webtorrent-livestream/signaling', 
      script: 'server.js',
      // ... existing config
    },
    // Optional: Add viewer to PM2
    {
      name: 'viewer',
      cwd: '/home/ubuntu/webtorrent-livestream/viewer',
      script: 'npm',
      args: 'run preview -- --port 8000 --host 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
    }
  ],
};
```

---

## 🚀 Quick Recovery Commands

### Full Restart (if everything is broken)
```bash
# 1. SSH into EC2
ssh -i ~/.ssh/bangfacetv.pem ubuntu@13.40.168.129

# 2. Restart PM2 services
pm2 restart all

# 3. Fix viewer service
pkill -f 'serve -s viewer/public'
pkill -f 'http-server'
cd /home/ubuntu/webtorrent-livestream/viewer
nohup npm run preview -- --port 8000 --host 0.0.0.0 > /tmp/vite-preview.log 2>&1 &

# 4. Restart Cloudflare tunnel
pkill cloudflared
nohup cloudflared tunnel --config /home/ubuntu/.cloudflared/config.yml run > /dev/null 2>&1 &

# 5. Verify everything
curl -I https://tv.danpage.uk/health
curl -I https://tv.danpage.uk/test-p2p-branded.html
```

### Test All Endpoints
```bash
# Health check
curl https://tv.danpage.uk/health

# HTML files (should not redirect)
curl -I https://tv.danpage.uk/test-p2p-branded.html

# Manifest
curl https://tv.danpage.uk/live/playlist.m3u8

# WebSocket (test with browser dev tools)
# wss://tv.danpage.uk/ws
```

---

## 📝 Notes

- **Never use `serve` package** for the viewer - it strips `.html` extensions
- **Always use Vite preview** for production web app serving
- **Cloudflare Tunnel** routes the domain to the correct services
- **PM2** manages the core services (owncast, broadcaster, signaling)
- **Viewer** can be in PM2 or run manually with nohup

---

**Last Updated**: October 28, 2025  
**Status**: ✅ HTML redirect issue fixed  
**Next Time**: Use this guide for quick recovery
