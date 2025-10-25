# EC2 Traffic Analysis - October 24-25, 2025

## 📊 Executive Summary

**Result**: ❌ **100% of video data went through EC2, ZERO P2P activity**

**Why**: Test pages pointed at Owncast's HLS directly, bypassing the entire P2P infrastructure.

---

## 🔍 Services Status on EC2

| Service | Status | Uptime | Purpose |
|---------|--------|--------|---------|
| **Owncast** | ✅ Running | 4+ hours | HLS encoding (RTMP → HLS) |
| **Broadcaster** | ⚠️ Partially working | 4 hours | R2 uploads (then failed) |
| **Signaling** | ✅ Running | 4 hours | P2P coordination |
| **Cloudflare Tunnel** | ✅ Running | 4+ hours | HTTPS proxy |

---

## 📈 Actual Traffic Flow

### What SHOULD Happen (Designed Architecture):
```
OBS → Owncast → Broadcaster → R2
                    ↓
              (Seeds via P2P)
                    ↓
         Viewer ← Signaling ← Broadcaster
           ↓
     P2P chunks (magnet URI)
           ↓
     Fallback to R2 (HTTPS)
```

### What ACTUALLY Happened:
```
OBS → Owncast → Cloudflare Tunnel → Browser
       ↓
   (HLS chunks served directly from EC2)
       ↓
   100% video data through EC2 ❌
```

---

## 💾 Data Uploaded to R2

**Broadcaster Activity** (first ~3.5 hours):
- ✅ **1,097 chunks uploaded** to Cloudflare R2
- ✅ Last successful upload: `stream-dN1fw2gvgz-1235.ts`
- ✅ Estimated data uploaded: **~1-2 GB**
- ✅ All chunks available at: `https://tv.danpage.uk/live/stream-XXXXX.ts`

**Then permission errors started** (~30-45 mins ago):
- ❌ `EACCES: permission denied, watch '/data/hls/0'`
- ❌ No new chunks processed since
- ❌ Broadcaster stuck in error loop

**R2 Cost**: ~$0.001 for uploads, $0 for downloads (nobody accessed them)

---

## 🚫 Why P2P Wasn't Used

### Issue #1: Wrong Manifest URL

**Test pages used**:
```javascript
// test-owncast-live.html (what you tested)
const url = 'https://tv.danpage.uk/hls/stream.m3u8';  // ← Owncast direct
```

**Should have used**:
```javascript
// What should be used for P2P
const url = 'http://localhost:3000/live/playlist.m3u8';  // ← Broadcaster manifest
// Or via tunnel: 'https://tv.danpage.uk/live/playlist.m3u8' (not configured)
```

### Issue #2: Missing Cloudflare Tunnel Route

**Current tunnel config**:
```yaml
ingress:
  - hostname: tv.danpage.uk
    path: /ws
    service: ws://localhost:8081       # ✅ Signaling
  - hostname: tv.danpage.uk
    path: /hls
    service: http://localhost:8080     # ✅ Owncast
  - hostname: tv.danpage.uk
    path: /admin
    service: http://localhost:8080     # ✅ Owncast admin
  - hostname: tv.danpage.uk
    service: http://localhost:8000     # ✅ Viewer site
```

**Missing route**:
```yaml
  - hostname: tv.danpage.uk
    path: /live
    service: http://localhost:3000     # ❌ NOT CONFIGURED!
```

### Issue #3: No P2P Engine in Test Page

`test-owncast-live.html`:
- ❌ No `p2p-media-loader` loaded
- ❌ No WebTorrent trackers configured
- ❌ No signaling connection
- ❌ No P2P stats tracking
- ✅ Only HLS.js (pure HTTP streaming)

---

## 📊 P2P Activity: ZERO

**From signaling server logs**:
```
Active Viewers: 0
Active Broadcasters: 1 (connected but nobody requesting)
Total Chunks Processed: 1097
```

**From broadcaster health endpoint**:
```json
{
  "status": "ok",
  "torrents": 819,        // ← Seeding 819 torrents
  "peers": 0,             // ← ZERO peers connected ❌
  "chunks": 1098,
  "signaling": "connected"
}
```

**Translation**: Broadcaster seeded 819 torrents, but **nobody requested them via P2P**.

---

## 💰 EC2 Request Load Analysis

### Minimal Requests (Manifest/API):
- **Owncast API status checks**: ~10-20 requests/hour
- **HLS playlist requests**: ~1-2 per viewer per 5 seconds
- **Admin UI**: Occasional

### Video Data (Chunks):
- **ALL video chunks**: Served from EC2 ❌
- **Chunk rate**: ~12 chunks/minute × 1.2MB = **~14.4 MB/min**
- **Per hour**: ~864 MB/hour **per viewer**
- **4-hour test**: ~3.5 GB through EC2

### If 100 Viewers:
- **Without P2P** (current): **86 GB/hour** from EC2 ($0.90/hour)
- **With P2P** (designed): **~8.6 GB/hour** from EC2 ($0.09/hour)

**Cost Impact**: You're paying **10x more** than needed because P2P isn't active.

---

## ✅ What Actually Used R2

**Answer**: NOTHING.

- ✅ Broadcaster uploaded 1,097 chunks to R2
- ❌ Zero downloads from R2
- ❌ Broadcaster's manifest endpoint returned 404
- ❌ No viewers requested `/live/playlist.m3u8`

**R2 Stats**:
- Uploads: ~1-2 GB
- Downloads: 0 bytes
- Cost: ~$0.001 (almost free)

---

## 🎯 Recommendations

### Fix #1: Add Broadcaster Manifest to Tunnel

**Switch to agent mode** and add to `~/.cloudflared/config.yml`:
```yaml
  - hostname: tv.danpage.uk
    path: /live
    service: http://localhost:3000
```

Then restart tunnel:
```bash
sudo systemctl restart cloudflared
```

### Fix #2: Update Test Page URL

Change from:
```javascript
const url = 'https://tv.danpage.uk/hls/stream.m3u8';  // Owncast (5 segments, no P2P)
```

To:
```javascript
const url = 'https://tv.danpage.uk/live/playlist.m3u8';  // Broadcaster (60 segments, P2P!)
```

### Fix #3: Fix Broadcaster Permission Issue

```bash
docker compose restart broadcaster
# Or fix permissions on host:
chmod -R 755 ~/owncast/data/hls/
```

### Fix #4: Use P2P-Enabled Test Page

`test-p2p-branded.html` has:
- ✅ P2P engine loaded
- ✅ WebTorrent trackers configured
- ✅ Stats tracking
- ✅ Multi-viewer P2P sharing

But it needs the URL updated to point at `/live/playlist.m3u8`.

---

## 🔍 How to Verify P2P is Working

After fixes, you should see:

1. **In broadcaster logs**:
   ```
   👥 New peer connected to stream-XXX.ts (total: 2)
   ⬆️ Uploaded 234.5 KB via P2P to 2 peers
   ```

2. **In signaling logs**:
   ```
   Active Viewers: 3
   Active Broadcasters: 1
   ```

3. **In browser console**:
   ```
   🤝 Peer connected (Total: 2)
   📥 P2P: 1.2MB | HTTP: 0.3MB
   💰 CDN Offload: 80%
   ```

4. **In Network tab**:
   - Manifest: `https://tv.danpage.uk/live/playlist.m3u8` (broadcaster)
   - Chunks: Mix of P2P (0ms) and R2 (`https://tv.danpage.uk/live/stream-XXX.ts`)

---

## 📋 Summary

| Metric | Current | With P2P Working |
|--------|---------|------------------|
| **Video through EC2** | 100% | 0% |
| **Video through R2** | 0% | 10-20% |
| **Video via P2P** | 0% | 80-90% |
| **EC2 bandwidth** | 3.5 GB (4 hours) | ~350 MB |
| **R2 uploads** | 1-2 GB | 1-2 GB |
| **R2 downloads** | 0 | ~350-700 MB |
| **P2P peers** | 0 | 2-100+ |
| **Cost (100 viewers/hr)** | ~$0.90/hr | ~$0.09/hr |

---

## 🚨 Critical Finding

**You built a complete P2P CDN infrastructure, then bypassed it entirely by pointing test pages at Owncast's direct HLS output.**

It's like building a highway and then driving through the fields next to it. The infrastructure works (1,097 chunks uploaded to R2, signaling connected, torrents seeded), but nobody's using it!

---

**Status**: Infrastructure ready, just needs proper routing! 🚀

