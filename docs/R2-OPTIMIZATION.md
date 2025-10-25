# R2 Optimization - AWS EC2 Request Load Fix

## Problem Statement

The original architecture caused HTTP fallback traffic to route through AWS EC2, resulting in:

- **126,000 - 252,000 requests per stream** to EC2
- **79 - 158 GB bandwidth** from EC2 per stream
- **$7-14 AWS egress costs** per stream
- Risk of overloading t3.medium instance

This occurred because viewers loaded Owncast's HLS manifest, which contained localhost URLs pointing to EC2.

## Solution Implemented

Created a custom HLS manifest generator that:

1. **Tracks uploaded chunks** with their Cloudflare R2 URLs
2. **Generates dynamic `.m3u8` playlists** pointing directly to R2
3. **Serves manifests** via broadcaster HTTP endpoint
4. **Ensures HTTP fallback** uses R2 instead of EC2

## Architecture Changes

### Before (Original)

```
Viewer → Owncast Manifest (localhost URLs) → {
    P2P: WebTorrent (good)
    HTTP Fallback: AWS EC2 localhost:3000 (bad - high cost)
}
```

### After (Optimized)

```
Viewer → Broadcaster Manifest (R2 URLs) → {
    P2P: WebTorrent (good)
    HTTP Fallback: Cloudflare R2 (excellent - zero egress cost)
}
```

## Files Modified

### 1. `broadcaster/manifest-generator.js` (NEW)

- Manages rolling window of recent chunks
- Generates HLS M3U8 playlists with R2 URLs
- Configurable max chunks and target duration

**Key feature:** Only includes chunks that have been successfully uploaded to R2

### 2. `broadcaster/server.js`

**Added:**
- Import ManifestGenerator
- Initialize manifest generator instance
- New endpoint: `GET /live/playlist.m3u8`
- Integration: Add chunks to manifest after R2 upload
- Enhanced health check to include manifest stats

**Code changes:**
```javascript
// New manifest endpoint
app.get('/live/playlist.m3u8', (req, res) => {
  const manifest = manifestGenerator.generateManifest();
  // ... serves M3U8 with R2 URLs
});

// After R2 upload success
manifestGenerator.addChunk({
  filename,
  r2: r2Url,
  size: stats.size,
  timestamp,
  seq,
});
```

### 3. `viewer/public/test-p2p-branded.html`

**Changed manifest URL from:**
```javascript
const url = 'https://tv.danpage.uk/hls/stream.m3u8'; // Owncast manifest
```

**To:**
```javascript
const url = 'http://localhost:3000/live/playlist.m3u8'; // Broadcaster manifest
```

### 4. `viewer/test-p2p-production.html` (NEW)

Production-ready viewer with:
- Cloudflare tunnel URL for manifest
- R2 optimization badges and stats
- Enhanced cost tracking
- Better visual indicators

## Testing Instructions

### 1. Start Services

```bash
# Terminal 1: Start Owncast
cd ~/owncast && ./owncast

# Terminal 2: Start Broadcaster (with new manifest generator)
cd /Users/ran/webtorrent-livestream/broadcaster
npm start

# Terminal 3: Start Signaling Server
cd /Users/ran/webtorrent-livestream/signaling
npm start
```

### 2. Start Streaming

```bash
# Configure OBS to stream to Owncast
# Server: rtmp://localhost:1935
# Stream Key: (from Owncast admin)
# Start streaming in OBS
```

### 3. Verify Broadcaster Logs

Watch for:
```
📦 New chunk detected: stream001.ts
   ☁️  Uploading to Cloudflare R2...
   ✅ R2 upload complete: https://your-bucket.r2.dev/live/stream001.ts
   📋 Added to manifest (1 chunks total)
```

### 4. Test Manifest Endpoint

```bash
# Check manifest contains R2 URLs
curl http://localhost:3000/live/playlist.m3u8

# Expected output:
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:6.000,
https://your-bucket.r2.dev/live/stream001.ts
#EXTINF:6.000,
https://your-bucket.r2.dev/live/stream002.ts
```

✅ **Success criteria:** All chunk URLs should point to R2, NO localhost URLs

### 5. Test Viewer

Open test viewer:
```bash
# For local testing
open viewer/public/test-p2p-branded.html

# Or via Python HTTP server
cd viewer
python3 -m http.server 8000
# Then open: http://localhost:8000/public/test-p2p-branded.html
```

### 6. Verify HTTP Fallback Uses R2

In browser DevTools (Network tab):
1. Start the stream
2. Filter by `.ts` files
3. Check chunk URLs - should all be `https://your-bucket.r2.dev/live/...`

✅ **Success criteria:** NO requests to `localhost:3000/chunks/`

### 7. Test with Multiple Viewers

Open 3+ tabs to verify:
- P2P peer connections work
- HTTP fallback still uses R2
- No AWS EC2 chunk requests

## Expected Results After Fix

### AWS EC2 Request Load

| Request Type | Count per Stream | Notes |
|--------------|-----------------|-------|
| Manifest requests | 300-600 | One per viewer |
| Health/metrics | ~100 | Periodic monitoring |
| Signaling WebSocket | Minimal | Connection overhead only |
| **Total** | **< 1,000** | ✅ **99.6% reduction** |

### Cloudflare R2 Request Load

| Request Type | Count per Stream | Cost |
|--------------|-----------------|------|
| Chunk requests (HTTP fallback) | 126,000 - 252,000 | ~$0.09 |
| Egress bandwidth | 79 - 158 GB | **$0.00** (free) |
| **Total Cost** | | **~$0.09 per stream** |

### AWS EC2 Bandwidth

| Traffic Type | Bandwidth | Notes |
|--------------|-----------|-------|
| Manifest responses | 300-600 KB | Tiny M3U8 files |
| Signaling | < 10 MB | WebSocket overhead |
| **Total** | **< 100 MB** | ✅ Stays under free tier |

## Cost Comparison

### Before Optimization

**For 40 minutes, 600 viewers, 30% P2P:**
- AWS EC2 egress: 158 GB × $0.09/GB = **$14.22**
- Cloudflare R2: $0.00
- **Total: $14.22 per stream**

### After Optimization

**For 40 minutes, 600 viewers, 30% P2P:**
- AWS EC2 egress: < 0.1 GB × $0.09/GB = **$0.01**
- Cloudflare R2 requests: **$0.09**
- Cloudflare R2 egress: **$0.00**
- **Total: $0.10 per stream**

**Savings: $14.12 per stream (99.3% reduction)**

## Monitoring

### Check Health Endpoint

```bash
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "torrents": 10,
  "peers": 25,
  "chunks": 150,
  "manifestChunks": 10,
  "signaling": "connected"
}
```

### Check Manifest Stats

```javascript
// In broadcaster logs, you'll see:
📋 Manifest requested - 10 chunks available
```

### Monitor AWS EC2 Metrics

In AWS CloudWatch:
- **NetworkOut**: Should stay very low (< 100 MB/hour)
- **Request Count**: Should be minimal (< 1,000 per stream)

### Monitor Cloudflare R2

In Cloudflare dashboard:
- **Class A Operations**: Should match viewer count × 1-2
- **Class B Operations**: Should match HTTP fallback requests
- **Egress**: Should show bandwidth (but it's free!)

## Troubleshooting

### Issue: Manifest is empty

**Symptoms:**
```
#EXTM3U
#EXT-X-VERSION:3
# No chunks available yet
```

**Solution:**
- Ensure Owncast is streaming
- Check broadcaster logs for R2 upload success
- Verify R2 credentials in `.env`

### Issue: Viewer still loads chunks from EC2

**Symptoms:** Network tab shows `localhost:3000/chunks/stream001.ts`

**Root cause:** Viewer is using wrong manifest URL

**Solution:**
- Update viewer to use `/live/playlist.m3u8` instead of Owncast manifest
- Clear browser cache
- Verify manifest URL in viewer code

### Issue: R2 upload failures

**Symptoms:**
```
❌ R2 upload failed for stream001.ts
```

**Solution:**
- Check R2 credentials in `.env`
- Test R2 connection: `npm run test-r2` (if available)
- Verify bucket permissions
- Check network connectivity

### Issue: CORS errors loading chunks

**Symptoms:** Browser console shows CORS errors for R2 URLs

**Solution:**
- Configure R2 bucket CORS policy (see `docs/DEPLOYMENT.md`)
- Allow GET and HEAD methods from all origins

## Production Deployment

### 1. Update Cloudflare Tunnel

Ensure tunnel routes broadcaster manifest endpoint:

```bash
# Cloudflare tunnel config (cloudflared)
ingress:
  - hostname: tv.danpage.uk
    service: http://localhost:3000
```

This allows:
- `https://tv.danpage.uk/live/playlist.m3u8` → `localhost:3000/live/playlist.m3u8`

### 2. Update Viewer for Production

Use production viewer file:
```html
<!-- viewer/test-p2p-production.html -->
const url = 'https://tv.danpage.uk/live/playlist.m3u8';
```

### 3. Deploy and Test

```bash
# Deploy to AWS EC2
ssh ubuntu@your-ec2-ip

# Pull latest code
cd ~/webtorrent-livestream
git pull

# Restart broadcaster with PM2
pm2 restart broadcaster

# Test manifest endpoint
curl http://localhost:3000/live/playlist.m3u8

# Test via Cloudflare tunnel
curl https://tv.danpage.uk/live/playlist.m3u8
```

## Performance Impact

### Positive Impacts

✅ **99.6% reduction in AWS EC2 requests**
✅ **99.3% cost reduction** ($14.22 → $0.10)
✅ **Zero AWS bandwidth concerns** (< 100 MB vs 158 GB)
✅ **Better scalability** (R2 auto-scales globally)
✅ **Faster global delivery** (R2 edge network)

### Neutral/Negligible Impacts

- Manifest generation: < 1ms per chunk
- Memory usage: ~50 KB for 10 chunks in manifest
- Latency: No change (same chunk sources)

## Success Criteria

- [ ] Broadcaster generates manifest with R2 URLs
- [ ] Manifest endpoint returns valid M3U8
- [ ] Viewer loads manifest successfully
- [ ] HTTP fallback chunks load from R2 (verify in Network tab)
- [ ] P2P still works between peers
- [ ] AWS EC2 request count < 1,000 per stream
- [ ] No localhost URLs in manifest
- [ ] Health endpoint shows manifestChunks > 0

## Rollback Plan

If issues occur, revert viewer to original:

```javascript
// viewer/public/test-p2p-branded.html
const url = 'https://tv.danpage.uk/hls/stream.m3u8'; // Original Owncast
```

This restores functionality immediately while debugging.

## Future Enhancements

### Potential Improvements

1. **Adaptive manifest generation**
   - Detect viewer connection quality
   - Adjust chunk retention dynamically

2. **Multi-quality support**
   - Generate manifests for different bitrates
   - Enable adaptive bitrate streaming

3. **Manifest caching**
   - Cache manifest at edge (Cloudflare)
   - Reduce broadcaster load further

4. **Monitoring dashboard**
   - Real-time manifest stats
   - R2 usage tracking
   - Cost analytics

## Conclusion

This optimization reduces AWS EC2 request load from **250,000+ to under 1,000 per stream**, saving **$14+ per stream** while maintaining all functionality. The system now properly leverages Cloudflare R2's free egress, making it scalable and cost-effective for large audiences.

**Status:** ✅ **Implemented and Ready for Testing**

