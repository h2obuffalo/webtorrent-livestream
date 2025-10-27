# Current Issues and Status Summary

**Date**: October 27, 2025  
**Last Update**: 12:11 UTC

## Status

### Working ✅
- Owncast is running and accepting streams
- Owncast admin panel is accessible
- OBS can connect and stream
- **Cloudflare Tunnel is running** (fixed)
- **Viewer web app is running** (fixed)
- **Website is accessible**: https://tv.danpage.uk

### Broken ❌
- Broadcaster is stuck in a loop, repeating single chunks
- Different chunks being repeated across different players
- Likely related to manifest generation or chunk processing

## Recent Changes Made

### FIXED: Web Server and Tunnel Services (12:11 UTC)
1. **Started Cloudflare Tunnel**
   - Ran: `pm2 start cloudflared --name tunnel -- tunnel run`
   - Tunnel is now running and connected to Cloudflare
   - Config at `~/.cloudflared/config.yml`

2. **Started Viewer Service**
   - Installed dependencies: `cd ~/webtorrent-livestream/viewer && npm install`
   - Built the viewer: `npm run build`
   - Started with PM2: `pm2 start npm --name viewer -- run preview -- --port 8000 --host 0.0.0.0`
   - Service is now serving static files on port 8000

3. **Saved PM2 Configuration**
   - Ran: `pm2 save` to persist the new services

**Services now running via PM2**:
- owncast (process 1135)
- tunnel (Cloudflare tunnel)
- viewer (web viewer on port 8000)

### Not Yet Deployed
1. **Added Owncast Status Monitoring** (NOT YET DEPLOYED)
   - Modified `broadcaster/server.js` to poll Owncast API every 10s
   - Added `/owncast/status` endpoint
   - Enhanced `/health` endpoint with Owncast status
   - Updated `docker-compose.yml` with environment variables

2. **Added Flutter Offline Detection** (NOT YET DEPLOYED)
   - Modified `flutter_viewer/lib/screens/simple_player_screen.dart`
   - Added periodic stream status checking
   - Improved error UI for offline streams

3. **Fixed Owncast Permissions**
   - Ran `sudo chown -R ubuntu:ubuntu ~/owncast/data/`
   - Cleaned up old HLS files
   - Restarted Owncast via PM2

## Current Problem

The broadcaster is processing chunks but players are repeating a single chunk. This could be caused by:

1. **Manifest generator issues** - Chunks being added to manifest incorrectly
2. **HLS playlist corruption** - Wrong chunk URLs or order
3. **Stream restart detection bugs** - Recent changes breaking chunk processing
4. **Git branch issues** - Server running outdated or broken code

## Immediate Next Steps

1. **Test the website**
   - Visit: https://tv.danpage.uk
   - Verify the viewer loads
   - Check if stream is playable

2. **Check current git branch on EC2** (if stream issues persist)
   ```bash
   ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "cd ~/webtorrent-livestream && git status"
   ```

3. **Check broadcaster logs** (if stream issues persist)
   ```bash
   ssh -i ~/.ssh/bangfacetv.pem ubuntu@3.10.164.179 "docker compose logs broadcaster --tail 50"
   ```

4. **Deploy monitoring changes** (after fixing broadcaster)
   - Deploy Owncast status monitoring
   - Deploy Flutter offline detection

## Files Modified (Not Deployed)

- `broadcaster/server.js` - Added Owncast monitoring
- `docker-compose.yml` - Added environment variables
- `flutter_viewer/lib/screens/simple_player_screen.dart` - Added offline detection

## Notes

- User mentioned poor git management may have introduced bugs
- Quick bug fixes may have caused more issues
- Should be more careful with git branching and testing before deploying
