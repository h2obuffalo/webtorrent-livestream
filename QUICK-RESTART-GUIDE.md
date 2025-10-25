# Quick Guide: Stream Restart Behavior

## ✅ What's Fixed

Your WebTorrent livestream system now **automatically detects and handles stream restarts**. No more stale chunks!

## 🎯 What Happens When You Restart OBS

### Automatic Detection (Two Ways)

1. **Timeout Detection** (30 seconds)
   - If no chunks arrive for 30 seconds, system assumes stream stopped
   - Next chunk triggers a fresh start

2. **Segment Number Detection** (instant)
   - If Owncast restarts and creates segment 0-2 again
   - System immediately recognizes it as a new stream

### Automatic Cleanup

When restart is detected:
```
🔄 Stream restart detected - clearing state...
   📋 Cleared X chunks from manifest
   🛑 Destroyed X active torrents
   🗑️  Cleared processed chunks set
   🔢 Reset chunk sequence to 0
   🆔 New stream session: [old] → [new]
✅ Stream state cleared - ready for new stream
```

## 📊 What You'll See

### Before Starting Stream
```bash
curl http://localhost:3000/health
# {"status":"ok","torrents":0,"chunks":0,"manifestChunks":0}

curl http://localhost:3000/live/playlist.m3u8
# No chunks available yet
```

### During Active Stream
```bash
curl http://localhost:3000/health
# {"status":"ok","torrents":5,"chunks":45,"manifestChunks":45}

curl http://localhost:3000/live/playlist.m3u8
# Full HLS playlist with R2 URLs
```

### R2 Storage Structure
Each stream session gets its own directory:
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

## 🧪 Testing Your Stream Restart

### Test 1: Stop and Wait
1. Start OBS stream
2. Let it run for 1-2 minutes
3. Stop OBS
4. Wait 35 seconds
5. Check logs: `docker compose logs broadcaster | grep "Stream restart"`
6. Start OBS again
7. Viewers should see new stream within 10 seconds

### Test 2: Quick Restart
1. Start OBS stream
2. Let 10+ segments process
3. Stop and immediately restart OBS
4. Logs should show: `⚠️  Early segment number detected`
5. New session ID created instantly

## 📱 Viewer Experience

### What Viewers See

**Old Behavior** (broken):
- Stuck on last frame of old stream
- Refresh doesn't help for 5 minutes
- Mixed old/new segments causing errors

**New Behavior** (working):
- Within 10-30 seconds, player automatically switches to new stream
- Manual refresh immediately loads new stream
- No stale chunks or mixed content

### Recommendation for Users
Tell your viewers to:
1. Just wait 30 seconds after you restart
2. Or manually refresh the page for instant update
3. No need to clear cache or restart browser

## 🔍 Monitoring

### Check Broadcaster Status
```bash
# View recent logs
docker compose logs --tail=50 broadcaster

# Monitor for restart events
docker compose logs -f broadcaster | grep "Stream restart"

# Check current health
curl http://localhost:3000/health
```

### Check Current Session ID
```bash
# Get a chunk URL from the manifest
curl http://localhost:3000/live/playlist.m3u8 | grep ".ts"

# Example output:
# https://pub-81f1de5a4fc945bdaac36449630b5685.r2.dev/live/1761405125500/stream-0.ts
#                                                           ^^^^^^^^^^^^^ session ID
```

## ⚙️ Configuration (Optional)

If you want to adjust the behavior, edit `/broadcaster/server.js`:

### Change Timeout Duration
```javascript
// Currently: 30 seconds
state.streamRestartTimer = setTimeout(() => {
  // ...
}, 30000); // Change this value (milliseconds)
```

### Change Segment Detection Threshold
```javascript
// Currently: triggers on segments 0-2 after 10 chunks
if (segmentMatch && state.chunkSequence > 10) {  // Change threshold here
  const segmentNum = parseInt(segmentMatch[1]);
  if (segmentNum <= 2) {  // Change segment numbers here
    // ...
  }
}
```

### Adjust Cache Duration
Edit `/broadcaster/r2-uploader.js`:
```javascript
// Currently: 10 seconds for segments
const cacheControl = key.endsWith('.ts') 
  ? 'public, max-age=10, s-maxage=10'  // Change max-age values
  : 'no-cache, no-store, must-revalidate';
```

## 🚨 Troubleshooting

### Issue: "Still seeing old stream"
**Check:**
1. Is broadcaster running? `docker compose ps`
2. Are logs showing restart detection? `docker compose logs broadcaster | grep restart`
3. Clear browser cache completely (Ctrl+Shift+Delete)
4. Check manifest URL directly: `http://localhost:3000/live/playlist.m3u8`

### Issue: "Restart not detected"
**Check:**
1. Verify chunks are being created: `docker compose logs broadcaster | grep "New chunk"`
2. Check if 30 seconds have passed since last chunk
3. Verify segment naming: Files should be like `0.ts`, `1.ts`, not `segment-0.ts`

### Issue: "Multiple restarts cause issues"
**This should not happen**, but if it does:
1. Restart broadcaster: `docker compose restart broadcaster`
2. Wait for "✅ Broadcaster service ready"
3. Start OBS stream fresh

## 📝 Summary

You can now **restart OBS anytime** without worrying about:
- ❌ Stale chunks
- ❌ Cache issues  
- ❌ Viewer confusion
- ❌ Manual intervention

The system will:
- ✅ Auto-detect the restart
- ✅ Clear old state
- ✅ Create new session
- ✅ Serve fresh chunks only
- ✅ Recover viewers automatically

**Just restart OBS and go!** 🎉

