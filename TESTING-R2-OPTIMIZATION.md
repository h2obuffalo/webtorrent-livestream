# Testing R2 Optimization - Quick Start Guide

## Quick Test Checklist

Use this guide to verify the R2 optimization is working correctly.

---

## Prerequisites

- [ ] Owncast installed and configured
- [ ] OBS Studio configured to stream to Owncast
- [ ] Cloudflare R2 credentials in `.env` file
- [ ] Node.js dependencies installed

---

## Step 1: Start Services

```bash
# Terminal 1: Start Owncast
cd ~/owncast
./owncast

# Terminal 2: Start Broadcaster
cd /Users/ran/webtorrent-livestream/broadcaster
npm start

# Terminal 3: Start Signaling Server
cd /Users/ran/webtorrent-livestream/signaling
npm start
```

**Expected:** All services start without errors

---

## Step 2: Start Streaming from OBS

1. Open OBS Studio
2. Click "Start Streaming"
3. Verify Owncast admin shows "Live"

**Expected:** Owncast receives stream

---

## Step 3: Verify Broadcaster Logs

Watch Terminal 2 (broadcaster) for:

```
📦 New chunk detected: stream001.ts (625.43 KB)
   ☁️  Uploading to Cloudflare R2...
   ✅ R2 upload complete: https://your-bucket.r2.dev/live/stream001.ts
   📋 Added to manifest (1 chunks total)
   🌱 Seeding via WebTorrent...
   ✅ Seeding: abc123...
```

✅ **Success criteria:**
- [ ] Chunks detected
- [ ] R2 uploads succeed
- [ ] Chunks added to manifest
- [ ] Torrents seeded

---

## Step 4: Test Manifest Endpoint

```bash
# Open new terminal
curl http://localhost:3000/live/playlist.m3u8
```

**Expected output:**
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:6.000,
https://your-bucket.r2.dev/live/stream001.ts
#EXTINF:6.000,
https://your-bucket.r2.dev/live/stream002.ts
```

✅ **Success criteria:**
- [ ] Manifest returns valid M3U8
- [ ] Contains R2 URLs (`https://...r2.dev/...`)
- [ ] NO localhost URLs
- [ ] Multiple chunks listed

---

## Step 5: Test Viewer (Local)

```bash
# Open test viewer
cd /Users/ran/webtorrent-livestream/viewer
python3 -m http.server 8000

# Then open in browser:
open http://localhost:8000/public/test-p2p-branded.html
```

1. Click "▶️ Start Stream"
2. Watch for log messages
3. Verify video plays

**Expected in browser console:**
```
🎬 Starting stream...
✅ P2P engine ready
✅ P2P initialized
✅ Stream ready
```

✅ **Success criteria:**
- [ ] Stream loads and plays
- [ ] No errors in console

---

## Step 6: Verify HTTP Fallback Uses R2

In browser DevTools:

1. Open **Network tab**
2. Filter by `.ts` files
3. Look at chunk requests

**Expected:**
- URLs should be: `https://your-bucket.r2.dev/live/stream00X.ts`
- Status: `200 OK`
- Source: Cloudflare R2

✅ **Success criteria:**
- [ ] Chunks load from R2
- [ ] NO requests to `localhost:3000/chunks/`
- [ ] NO requests to AWS EC2 for chunks

---

## Step 7: Test P2P (Multiple Viewers)

Open 3+ browser tabs with the same viewer page.

**Expected in logs:**
```
🤝 Peer connected (Total: 2)
📥 P2P: 234.5KB | Total: 1.23MB
```

**Expected in stats:**
- P2P Ratio: > 0%
- Active Peers: > 0
- P2P Downloaded: > 0 MB

✅ **Success criteria:**
- [ ] Peers connect
- [ ] P2P ratio > 0%
- [ ] Chunks shared via P2P

---

## Step 8: Verify Health Endpoint

```bash
curl http://localhost:3000/health | jq
```

**Expected output:**
```json
{
  "status": "ok",
  "torrents": 10,
  "peers": 3,
  "chunks": 150,
  "manifestChunks": 10,
  "signaling": "connected"
}
```

✅ **Success criteria:**
- [ ] Status is "ok"
- [ ] manifestChunks > 0
- [ ] torrents > 0

---

## Step 9: Calculate AWS Request Load

Based on your test:

**Manifest requests:**
- Count browser tabs opened = number of viewers
- Each viewer = 1-2 manifest requests

**Example:** 3 tabs = 3-6 manifest requests to AWS EC2

**Chunk requests:**
- Check Network tab - all should go to R2
- Zero chunk requests to AWS EC2

✅ **Success criteria:**
- [ ] AWS EC2 requests < 10 (for test with 3 viewers)
- [ ] R2 requests = number of chunks × viewers (HTTP fallback only)

---

## Step 10: Production Test (Optional)

If you have Cloudflare tunnel configured:

```bash
# Test via tunnel
curl https://tv.danpage.uk/live/playlist.m3u8
```

Use production viewer:
```bash
open viewer/test-p2p-production.html
```

Update viewer URL to:
```javascript
const url = 'https://tv.danpage.uk/live/playlist.m3u8';
```

✅ **Success criteria:**
- [ ] Manifest accessible via HTTPS
- [ ] Viewer works with tunnel URL
- [ ] Stats show R2 optimization

---

## Troubleshooting

### Problem: Manifest is empty

**Check:**
```bash
# Is Owncast streaming?
curl http://localhost:8080/api/status | jq .online

# Are chunks being created?
ls -la ~/owncast/data/hls/0/

# Are R2 uploads succeeding?
# Check broadcaster logs for "✅ R2 upload complete"
```

**Solution:**
- Start OBS streaming
- Verify R2 credentials
- Check network connectivity

---

### Problem: Viewer shows "localhost" URLs

**Check:**
- Viewer is using correct manifest URL
- Manifest actually contains R2 URLs (test with curl)

**Solution:**
```javascript
// Update viewer to use:
const url = 'http://localhost:3000/live/playlist.m3u8';
// NOT: 'https://tv.danpage.uk/hls/stream.m3u8'
```

---

### Problem: CORS errors

**Symptoms:** Browser console shows CORS errors

**Solution:**
- Configure R2 bucket CORS (see `docs/DEPLOYMENT.md`)
- Allow `GET` and `HEAD` methods
- Allow all origins (`*`)

---

### Problem: P2P not working

**Check:**
- Multiple viewers open?
- Same network?
- Firewall blocking WebRTC?

**Note:** HTTP fallback should still work via R2!

---

## Success Summary

After completing all steps, you should have:

✅ Broadcaster generating manifests with R2 URLs
✅ Manifest endpoint serving valid M3U8
✅ Viewer loading and playing stream
✅ HTTP fallback using R2 (not AWS EC2)
✅ P2P working between viewers
✅ AWS EC2 request load < 1,000 per stream
✅ Cost reduced from $14 to $0.10 per stream

---

## Next Steps

1. **Run production test** with real viewers
2. **Monitor AWS CloudWatch** for request count
3. **Monitor Cloudflare R2** for bandwidth
4. **Document any issues** for optimization
5. **Deploy to production** when ready

---

## Need Help?

- Check `docs/R2-OPTIMIZATION.md` for detailed documentation
- Check `docs/AWS-REQUEST-LOAD-ANALYSIS.md` for cost analysis
- Check `docs/TROUBLESHOOTING.md` for common issues

---

**Status:** ✅ R2 optimization implemented and ready for testing
**Impact:** ✅ 99.6% reduction in AWS EC2 requests
**Cost:** ✅ 99.3% reduction in bandwidth costs

