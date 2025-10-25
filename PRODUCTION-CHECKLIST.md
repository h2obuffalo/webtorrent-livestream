# Production Deployment Checklist

⚠️ **Critical items to verify/change before going live**

---

## 🔐 Security & Credentials

- [ ] Change Owncast admin password from default
- [ ] Change OBS stream key from `abc123` to something secure
- [ ] Rotate R2 access keys if they've been exposed
- [ ] Update signaling server to require authentication (optional)

---

## 🌐 Configuration

### `.env` File (Both Local & EC2)

- [ ] **CDN_HOSTNAME** - Set to R2 public URL (e.g., `pub-xxx.r2.dev`)
  - ❌ NOT `tv.danpage.uk` (this breaks segment loading)
  - ✅ Use actual R2 public URL from Cloudflare dashboard

### R2 Bucket CORS Configuration (CRITICAL!)

- [ ] **Configure CORS on R2 bucket** - Required for browser access
  - Go to: Cloudflare Dashboard → R2 → bangbucket → Settings → CORS Policy
  - Add this policy:
    ```json
    [
      {
        "AllowedOrigins": ["https://tv.danpage.uk", "https://*.danpage.uk"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
  - Without this, browser will block video segments with CORS errors
  
- [ ] **TRACKER_URLS** - Remove dead trackers
  - ❌ Remove `wss://tracker.fastcast.nz` (dead)
  - ✅ Use: `wss://tracker.openwebtorrent.com,wss://tracker.webtorrent.dev,wss://tracker.btorrent.xyz`

- [ ] **ENABLE_DEBUG_LOGGING** - Set to `false` for production

---

## 🎬 OBS Configuration

- [ ] Use **hardware encoding** (not software)
  - Go to: Settings → Output → Encoder
  - Select: Hardware encoder (e.g., `H264 (Apple VT)` on Mac, `NVENC` on Nvidia)
  - Software encoding causes corrupted fragments

- [ ] Set reasonable bitrate
  - 1080p: 4500-6000 kbps
  - 720p: 2500-4000 kbps

- [ ] Set keyframe interval to 2 seconds
  - Settings → Output → Advanced → Keyframe Interval: `2`

---

## 📡 Owncast Configuration

- [ ] Increase segment count to 20+ (from default 10)
  - Admin → Settings → Video → Stream Output
  - "Number of segments in playlist" → `20` or higher
  - Provides more stability for late-joining viewers

- [ ] Set video quality presets appropriately
  - Don't transcode to more qualities than needed
  - Each quality uses CPU/memory

---

## 🗑️ Cleanup & Maintenance

- [ ] Auto-cleanup cron job is running on EC2
  - Deletes `.ts` files older than 1 hour
  - Check: `crontab -l -u ubuntu`

- [ ] Monitor disk space
  - HLS segments can fill disk quickly
  - Current: `df -h /home/ubuntu/owncast/data/hls`

---

## 🧪 Testing Before Live Event

- [ ] Test OBS → Owncast → Broadcaster → P2P flow
- [ ] Verify P2P works across devices (phone, desktop)
- [ ] Test with multiple viewer tabs (3-5)
- [ ] Confirm R2 URLs are working (check browser network tab)
- [ ] Verify no 404 errors on segments
- [ ] Check signaling server shows active connections
- [ ] Test stream recovery after OBS disconnect/reconnect

---

## 🚀 Production Deployment

- [ ] All services running via Docker Compose or PM2
- [ ] Cloudflare tunnel running as systemd service
- [ ] Owncast running as systemd service
- [ ] Monitor logs during event:
  ```bash
  docker logs -f webtorrent-broadcaster
  docker logs -f webtorrent-signaling
  tail -f ~/owncast/owncast.log
  ```

---

## 🔄 Rollback Plan

If issues occur during live event:

1. **Stop P2P system**, point viewers directly to Owncast:
   ```
   https://tv.danpage.uk/hls/stream.m3u8
   ```

2. **Restart services**:
   ```bash
   docker compose restart
   cd ~/owncast && pkill owncast && ./owncast &
   ```

3. **Last resort**: Stream directly via OBS to YouTube/Twitch as backup

---

## 📋 Post-Event

- [ ] Archive logs for review
- [ ] Check R2 storage usage and costs
- [ ] Review any errors or issues
- [ ] Document lessons learned
- [ ] Clean up old R2 files if needed

---

## 🐛 Known Issues

1. **Permission errors on broadcaster** - Harmless, watcher still works
2. **Cloudflare bot protection** - May trigger 403 on rapid requests (auto-clears)
3. **Session changes** - Browser auto-reloads when OBS reconnects (expected)

---

**Last Updated**: 2025-10-25

