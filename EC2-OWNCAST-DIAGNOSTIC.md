# EC2 Owncast Diagnostic Steps

Your EC2 server at `3.10.164.179` is not responding to the admin panel. Here's how to diagnose the issue:

## Quick Diagnostic Commands

Run these commands one at a time in your terminal:

### 1. Check if Owncast container is running:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker ps -a"
```

### 2. Check Docker status:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "systemctl status docker"
```

### 3. Check Owncast logs:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker logs owncast --tail 50"
```

### 4. Check disk space (you mentioned expanding storage):
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "df -h"
```

### 5. Check if Owncast API is responding:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "curl http://localhost:8080/api/status"
```

### 6. Check Docker Compose status:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && docker compose ps"
```

## Common Issues After Storage Expansion

1. **Docker service not started** - If you rebooted after expanding storage
   - Fix: `sudo systemctl start docker`

2. **Owncast container stopped** - Container may have stopped during reboot
   - Fix: `docker start owncast` or `docker compose up -d`

3. **Filesystem expansion not applied** - Need to resize the filesystem
   - Fix: `sudo resize2fs /dev/xvda1` (check actual device with `df -h`)

4. **Docker Compose services not running**
   - Fix: `cd ~/webtorrent-livestream && docker compose up -d`

## Restart Owncast

If Owncast is stopped, restart it with:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && docker compose up -d owncast"
```

## Check Owncast Configuration

To see Owncast's configuration and status:
```bash
ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker exec owncast owncast -version"
```

Run these commands and share the output so we can diagnose the exact issue.

