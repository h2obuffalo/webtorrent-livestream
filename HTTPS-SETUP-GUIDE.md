# HTTPS Setup Guide

This guide shows how to enable HTTPS for your WebTorrent Livestream setup using Cloudflare Origin Certificates.

## Quick Start

### 1. Certificates Already Installed ✅

Your Cloudflare Origin Certificate and private key are already installed:
- `certificates/origin.pem` - Public certificate
- `certificates/origin-key.pem` - Private key (secure permissions)

### 2. Enable HTTPS

Add these environment variables to your `.env` file:

```bash
# Enable HTTPS
ENABLE_HTTPS=true

# Optional: Custom ports (defaults shown)
HTTPS_PORT=3443
WSS_PORT=8443

# Optional: Custom certificate paths (defaults shown)
CERT_PATH=../certificates/origin.pem
KEY_PATH=../certificates/origin-key.pem
```

### 3. Start Services

#### Docker (Recommended)
```bash
# Start with HTTPS enabled
ENABLE_HTTPS=true docker-compose up -d

# Or set in .env file and run normally
docker-compose up -d
```

#### Local Development
```bash
# Set environment variable
export ENABLE_HTTPS=true

# Start services
npm run dev
```

### 4. Verify HTTPS is Working

Check the service status:
- **HTTP**: http://localhost:3000/health
- **HTTPS**: https://localhost:3443/health
- **WebSocket**: ws://localhost:8080
- **Secure WebSocket**: wss://localhost:8443

## What This Enables

### For Your Setup

1. **Secure Communications**: All data between Cloudflare and your EC2 instance is encrypted
2. **Better Cloudflare Integration**: Optimized for Cloudflare's edge network
3. **Enhanced Security**: End-to-end encryption from viewer to origin
4. **Future-Proof**: 15-year certificate validity

### Service Changes

- **Broadcaster**: Runs on both HTTP (3000) and HTTPS (3443)
- **Signaling**: Runs on both WS (8080) and WSS (8443)
- **Automatic Fallback**: If certificates fail to load, falls back to HTTP mode
- **Docker Support**: Certificates mounted and available in containers

## Cloudflare Configuration

### 1. SSL/TLS Settings

In your Cloudflare Dashboard:
- Go to SSL/TLS → Overview
- Set encryption mode to **"Full (strict)"**
- Enable **"Always Use HTTPS"**

### 2. Cloudflare Tunnels

If using Cloudflare Tunnels:
- Update tunnel configuration to use `https://your-domain:3443`
- This ensures secure connection from Cloudflare to your origin

### 3. DNS Records

Update your DNS records to point to the HTTPS endpoints:
- `api.your-domain.com` → `https://your-ec2-ip:3443`
- `ws.your-domain.com` → `wss://your-ec2-ip:8443`

## Troubleshooting

### Certificate Issues

If HTTPS fails to start:
```bash
# Check certificate files exist
ls -la certificates/

# Check permissions
ls -la certificates/origin*

# Should show:
# -rw-r--r-- origin.pem
# -rw------- origin-key.pem
```

### Service Not Starting

Check logs for certificate errors:
```bash
# Docker logs
docker-compose logs broadcaster
docker-compose logs signaling

# Look for SSL certificate loading messages
```

### Fallback to HTTP

If certificates fail to load, services automatically fall back to HTTP mode. Check the logs for:
```
❌ Failed to load SSL certificates: [error]
   Falling back to HTTP mode
```

## Security Notes

- ✅ Private key has secure permissions (600)
- ✅ Certificate is readable by all (644)
- ✅ Certificates are mounted read-only in Docker
- ✅ 15-year validity (no renewal needed)
- ✅ Optimized for Cloudflare infrastructure

## Next Steps

1. **Test HTTPS endpoints** to ensure they're working
2. **Update Cloudflare settings** for full SSL/TLS
3. **Configure Cloudflare Tunnels** to use HTTPS origin
4. **Update client applications** to use HTTPS/WSS endpoints
5. **Monitor logs** for any SSL-related issues

Your setup is now ready for secure, production-grade HTTPS communication! 🚀
