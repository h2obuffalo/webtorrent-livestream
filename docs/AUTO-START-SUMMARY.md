# Auto-Start Configuration Summary

**Date**: October 27, 2025  
**Status**: ✅ Fully Configured

## What Auto-Starts on EC2 Reboot

### 1. Docker Service
- **Service**: `docker.service`
- **Status**: ✅ Enabled
- **What it does**: Starts Docker daemon on boot
- **Required for**: Docker Compose services (broadcaster, signaling)

### 2. Docker Compose Services
- **Service**: `docker-compose-owncast.service`
- **Status**: ✅ Enabled
- **What it does**: Automatically runs `docker compose up -d` after Docker starts
- **Location**: `/home/ubuntu/webtorrent-livestream`
- **Starts**: broadcaster, signaling containers

### 3. PM2 Process Manager
- **Service**: `pm2-ubuntu.service`
- **Status**: ✅ Enabled
- **What it does**: Restores all PM2 processes on boot
- **Starts**: owncast, tunnel, viewer

### 4. PM2-Saved Processes
These processes are automatically restored by PM2:
- **owncast** - Owncast streaming server
- **tunnel** - Cloudflare tunnel (cloudflared)
- **viewer** - Web viewer on port 8000

## Startup Order

1. Docker daemon starts
2. Docker Compose service starts (launches broadcaster, signaling containers)
3. PM2 service starts
4. PM2 restores saved processes (owncast, tunnel, viewer)

## Verification Commands

```bash
# Check all enabled services
systemctl list-unit-files | grep -E 'pm2|docker-compose-owncast|docker' | grep enabled

# Check current status
systemctl status docker-compose-owncast.service
systemctl status pm2-ubuntu.service

# Check if services will auto-start
systemctl is-enabled docker-compose-owncast.service  # should return "enabled"
systemctl is-enabled pm2-ubuntu.service  # should return "enabled"

# Verify Docker Compose will run on boot
cat /etc/systemd/system/docker-compose-owncast.service

# Verify PM2 processes are saved
pm2 list
pm2 save
```

## Testing Auto-Start

To test if everything auto-starts correctly:

```bash
# Simulate a reboot by disabling and re-enabling the services
sudo systemctl stop docker-compose-owncast.service
sudo systemctl stop pm2-ubuntu.service

# Then restart them (like what would happen on boot)
sudo systemctl start docker-compose-owncast.service
sudo systemctl start pm2-ubuntu.service

# Or actually reboot the EC2 instance
sudo reboot
```

## What Happens After Reboot

1. Docker starts
2. Docker Compose automatically runs and starts containers
3. PM2 automatically restores owncast, tunnel, and viewer
4. All services are running within ~30-60 seconds

## Manual Services (No Auto-Start)

These are not configured for auto-start but may be needed:
- None - all essential services are now auto-starting

## Troubleshooting

If services don't start after reboot:

```bash
# Check Docker
systemctl status docker.service

# Check Docker Compose
systemctl status docker-compose-owncast.service
journalctl -u docker-compose-owncast.service -n 50

# Check PM2
systemctl status pm2-ubuntu.service
journalctl -u pm2-ubuntu.service -n 50

# Manually start if needed
sudo systemctl start docker-compose-owncast.service
sudo systemctl start pm2-ubuntu.service

# Verify containers are running
docker compose ps

# Verify PM2 processes
pm2 list
```

## Files Modified

- **Created**: `/etc/systemd/system/docker-compose-owncast.service`
- **Created**: `/etc/systemd/system/pm2-ubuntu.service` (by PM2)
- **Updated**: `~/.pm2/dump.pm2` (PM2 saved process list)

## Notes

- Services will restart automatically after EC2 instance reboot
- No manual intervention required after reboot
- All critical services are now resilient to EC2 restarts
- Cloudflare tunnel will reconnect automatically
- Docker containers will restart automatically
- PM2 will restore all Node.js processes
