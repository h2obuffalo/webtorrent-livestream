# Deploy Stream Restart Detection to AWS EC2

## What This Update Does

This update adds **automatic stream restart detection** to prevent viewers from seeing old/stale chunks when you restart OBS.

### Features Added:
- ✅ Automatic detection of stream restarts (30s timeout + segment numbering)
- ✅ Unique session IDs per stream (prevents R2 path conflicts)
- ✅ Reduced cache durations (10s for segments, no-cache for playlists)
- ✅ Automatic state clearing (manifest, torrents, sequences)

## Quick Deployment Steps

### Step 1: Push Code to GitHub

First, push the committed changes from your local machine:

```bash
# On your local machine (Mac)
cd /Users/ran/webtorrent-livestream

# Push to GitHub (you may need to authenticate)
git push origin feature/p2p-optimization
```

**If you get authentication errors:**
```bash
# Option A: Use GitHub CLI
gh auth login
git push origin feature/p2p-optimization

# Option B: Use personal access token
# Create token at: https://github.com/settings/tokens
# Then use token as password when prompted
```

### Step 2: Deploy to EC2

SSH into your EC2 instance and run the deployment script:

```bash
# SSH to your EC2 server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/webtorrent-livestream

# Pull and run deployment script
git pull origin feature/p2p-optimization
bash deploy/deploy-restart-fix.sh
```

The script will:
1. ✅ Pull latest code from GitHub
2. ✅ Rebuild the broadcaster container (Docker) or update dependencies (PM2)
3. ✅ Restart the broadcaster service
4. ✅ Show you logs and status
5. ✅ Test health endpoint

### Step 3: Verify Deployment

Check that the broadcaster is running with the new code:

```bash
# Check container/process status
docker compose ps          # If using Docker
# OR
pm2 status                 # If using PM2

# View live logs
docker compose logs -f broadcaster    # Docker
# OR
pm2 logs broadcaster                  # PM2

# Test health endpoint
curl http://localhost:3000/health
```

You should see the broadcaster running normally.

## Testing Stream Restart

### Test 1: Timeout-Based Restart
1. Start your OBS stream
2. Wait for 1-2 minutes
3. Stop OBS
4. Wait 35 seconds (to trigger timeout)
5. Check logs: `docker compose logs broadcaster | grep "Stream restart"`
6. Start OBS again
7. Viewers should see new stream within 10 seconds

### Test 2: Quick Restart
1. Start OBS stream
2. Let 10+ segments process
3. Stop and immediately restart OBS
4. Logs should show: `⚠️  Early segment number detected`
5. New session ID created instantly

### Expected Log Output

When a restart is detected, you'll see:
```
🔄 Stream restart detected - clearing state...
   📋 Cleared X chunks from manifest
   🛑 Destroyed X active torrents
   🗑️  Cleared processed chunks set
   🔢 Reset chunk sequence to 0
   🆔 New stream session: 1761405094850 → 1761405125500
✅ Stream state cleared - ready for new stream
```

## Monitoring

### Check if it's working
```bash
# View broadcaster logs
docker compose logs --tail=100 broadcaster | grep -E "(restart|session|manifest)"

# Check current health
curl http://localhost:3000/health | jq .

# View current manifest (should show R2 URLs with session IDs)
curl http://localhost:3000/live/playlist.m3u8
```

### Check R2 Storage
Each stream session now gets its own directory:
```
live/
  ├── 1761405094850/    ← Old stream (stopped)
  │   ├── 0.ts
  │   ├── 1.ts
  │   └── ...
  └── 1761405125500/    ← New stream (active)
      ├── 0.ts
      ├── 1.ts
      └── ...
```

## Viewer Impact

**What viewers will experience:**

✅ **During Normal Streaming:**
- No change, everything works as before

✅ **When You Restart OBS:**
- Within 10-30 seconds, player automatically switches to new stream
- Manual page refresh immediately loads new stream
- No more stale chunks or mixed old/new content

✅ **For Android TV:**
- Same improvements apply
- May need manual reload within 30 seconds of restart

## Rollback (If Needed)

If you need to revert to the previous version:

```bash
# On EC2 server
cd ~/webtorrent-livestream

# Get previous commit hash
git log --oneline -5

# Revert to previous commit (replace HASH with actual commit hash)
git checkout <previous-commit-hash>

# Restart broadcaster
docker compose up -d --force-recreate broadcaster
# OR
pm2 restart broadcaster
```

## Troubleshooting

### Issue: "Still seeing old stream"
**Solution:**
1. Check broadcaster logs for restart detection: `docker compose logs broadcaster | grep restart`
2. Verify 30 seconds have passed since last chunk
3. Clear viewer browser cache completely
4. Check manifest directly: `curl http://localhost:3000/live/playlist.m3u8`

### Issue: "Restart not detected"
**Solution:**
1. Verify chunks are being created: `docker compose logs broadcaster | grep "New chunk"`
2. Check if 30 seconds have passed
3. Verify segment naming: Files should be like `0.ts`, `1.ts`, not `segment-0.ts`

### Issue: "Deployment script failed"
**Solution:**
1. Manually pull code: `git pull origin feature/p2p-optimization`
2. Rebuild: `docker compose build broadcaster`
3. Restart: `docker compose up -d broadcaster`
4. Check logs: `docker compose logs broadcaster`

## Support Files

Documentation included in this update:
- `STREAM-RESTART-FIX.md` - Technical details of the implementation
- `QUICK-RESTART-GUIDE.md` - Quick reference for stream restart behavior
- `deploy/deploy-restart-fix.sh` - Automated deployment script

## Summary

### What Changed:
- `broadcaster/server.js` - Added restart detection and session management
- `broadcaster/r2-uploader.js` - Reduced cache durations

### What You Need to Do:
1. ✅ Push code to GitHub (Step 1 above)
2. ✅ SSH to EC2 and run deployment script (Step 2 above)
3. ✅ Test stream restart (Step 3 above)

### Expected Result:
- Stream restarts automatically detected
- Old chunks cleared immediately
- New session ID created for each stream
- Viewers recover within 10-30 seconds
- No manual intervention needed

---

**Questions or issues?** Check the logs first:
```bash
docker compose logs -f broadcaster
```

**Need more details?** Read:
- `STREAM-RESTART-FIX.md` - Full technical documentation
- `QUICK-RESTART-GUIDE.md` - User-friendly guide

