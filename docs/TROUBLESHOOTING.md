# WebTorrent Live Streaming - Troubleshooting Guide

Common issues and their solutions for the WebTorrent live streaming system.

---

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Video Playback Issues](#video-playback-issues)
3. [P2P Issues](#p2p-issues)
4. [Owncast Issues](#owncast-issues)
5. [R2 Upload Issues](#r2-upload-issues)
6. [Network Issues](#network-issues)
7. [Performance Issues](#performance-issues)
8. [Platform-Specific Issues](#platform-specific-issues)

---

## Connection Issues

### Problem: WebSocket Connection Refused

**Symptoms:**
- Viewer shows "Connecting..." indefinitely
- Browser console: `ERR_CONNECTION_REFUSED` for WebSocket
- Status indicator stays red

**Diagnosis:**
```bash
# Check if signaling server is running
pm2 status signaling
# or
ps aux | grep signaling

# Test WebSocket connection
wscat -c ws://localhost:8080

# Check if port is listening
netstat -an | grep 8080
```

**Solutions:**

1. **Server not running:**
   ```bash
   cd signaling
   npm start
   # or with PM2:
   pm2 start ecosystem.config.js
   ```

2. **Wrong URL in viewer:**
   - Check `viewer/src/player.js` line 5: `signalingUrl`
   - Should match signaling server URL
   - For local: `ws://localhost:8080`
   - For production: `ws://your-server-ip:8080` or `wss://your-domain.com/ws/`

3. **Firewall blocking port:**
   ```bash
   # Check firewall
   sudo ufw status | grep 8080
   
   # Allow port
   sudo ufw allow 8080/tcp
   ```

4. **Signaling server crashed:**
   ```bash
   # Check logs
   pm2 logs signaling --lines 50
   
   # Restart
   pm2 restart signaling
   ```

---

### Problem: OBS Cannot Connect to RTMP

**Symptoms:**
- OBS shows "Failed to connect to server"
- Red "Disconnected" indicator in OBS

**Diagnosis:**
```bash
# Check if Owncast is running
curl http://localhost:8080/api/status

# Check RTMP port
netstat -an | grep 1935

# Test RTMP connection
telnet localhost 1935
```

**Solutions:**

1. **Owncast not running:**
   ```bash
   cd owncast
   ./owncast
   ```

2. **Wrong stream key:**
   - Go to Owncast admin: `http://localhost:8080/admin`
   - Copy exact stream key
   - Paste in OBS Settings → Stream

3. **Wrong server URL:**
   - OBS Settings → Stream → Server
   - Should be: `rtmp://localhost:1935` (local)
   - Or: `rtmp://server-ip:1935` (remote)

4. **Firewall blocking RTMP:**
   ```bash
   sudo ufw allow 1935/tcp
   ```

5. **Port already in use:**
   ```bash
   # Find what's using port 1935
   sudo lsof -i :1935
   
   # Kill the process or change Owncast port
   ```

---

### Problem: Broadcaster Cannot Connect to Signaling

**Symptoms:**
- Broadcaster logs: `❌ Signaling WebSocket error`
- Chunks are seeded but viewers don't receive notifications

**Diagnosis:**
```bash
# Check broadcaster logs
pm2 logs broadcaster

# Test signaling from broadcaster machine
wscat -c ws://localhost:8080
```

**Solutions:**

1. **Check SIGNALING_URL in .env:**
   ```bash
   cat .env | grep SIGNALING_URL
   ```
   Should be: `ws://localhost:8080` or correct server URL

2. **Signaling server not ready:**
   - Wait a few seconds for signaling to start
   - Broadcaster will auto-reconnect

3. **Network issue:**
   - If broadcaster and signaling on different machines, verify network connectivity:
   ```bash
   ping signaling-server-ip
   telnet signaling-server-ip 8080
   ```

---

## Video Playback Issues

### Problem: Video Player Shows Black Screen

**Symptoms:**
- Video element loads but shows black screen
- No error in console (sometimes)

**Diagnosis:**
```javascript
// In browser console on viewer page
console.log('MediaSource ready state:', video.readyState);
console.log('SourceBuffer:', state.sourceBuffer);
console.log('Buffered ranges:', state.sourceBuffer?.buffered.length);
console.log('Video src:', video.src);
```

**Solutions:**

1. **No chunks received yet:**
   - Wait for first chunk to arrive
   - Check signaling connection is established
   - Verify broadcaster is seeding chunks

2. **Codec not supported:**
   ```javascript
   // Check codec support
   MediaSource.isTypeSupported('video/mp2t; codecs="avc1.42E01E, mp4a.40.2"')
   ```
   - If false, browser doesn't support codec
   - Check Owncast encoding settings

3. **SourceBuffer not initialized:**
   - Check console for MediaSource errors
   - Verify MediaSource API is supported

4. **Autoplay blocked by browser:**
   - Click video player to manually start playback
   - Browser may block autoplay with audio
   - Solution: Mute video or wait for user interaction

---

### Problem: Video Stutters or Buffers Constantly

**Symptoms:**
- Video pauses every few seconds
- "Buffering..." message
- Low buffer health indicator

**Diagnosis:**
```javascript
// In browser console
console.log('Chunks loaded:', state.stats.chunksLoaded);
console.log('P2P bytes:', state.stats.p2pBytes);
console.log('HTTP bytes:', state.stats.httpBytes);
console.log('Buffer health:', video.buffered.end(0) - video.currentTime);
```

**Solutions:**

1. **Slow download speed:**
   - Check network speed
   - Reduce Owncast bitrate (Owncast admin → Video settings)
   - Use HTTP fallback (more reliable than P2P)

2. **Buffer management issue:**
   - Check for errors in console about SourceBuffer
   - May need to increase buffer target in `player.js`

3. **Too many chunks in queue:**
   ```javascript
   // Check chunk queue length
   console.log('Queue length:', state.chunkQueue.length);
   ```
   - If > 20, might be appending too fast
   - Adjust buffer management logic

4. **Network congestion:**
   - Monitor network tab in browser DevTools
   - Check for failed requests or slow downloads
   - Consider using lower quality stream

---

### Problem: Video Plays but Audio is Out of Sync

**Symptoms:**
- Audio lags behind video (or vice versa)
- Sync gets worse over time

**Causes:**
- Encoding issue in Owncast
- MediaSource buffer timing issue
- Dropped frames

**Solutions:**

1. **Owncast encoding settings:**
   - Use constant bitrate (CBR) not variable (VBR)
   - Match audio sample rate (48kHz recommended)
   - Keyframe interval: 2 seconds

2. **Browser issue:**
   - Try different browser
   - Clear cache and reload page

3. **Buffering strategy:**
   - May need to implement timestamp-based buffer management
   - Currently using sequence mode, which should maintain sync

---

## P2P Issues

### Problem: Zero Peers Despite Multiple Viewers

**Symptoms:**
- All viewers show `Peer count: 0`
- Video still plays (using HTTP fallback)
- Console shows P2P attempts timing out

**Diagnosis:**
```javascript
// In browser console on viewer
console.log('WebTorrent client:', state.wtClient);
console.log('Active torrents:', state.wtClient.torrents.length);
state.wtClient.torrents.forEach(t => {
  console.log('Torrent:', t.name, 'Peers:', t.numPeers);
});
```

**Common Causes & Solutions:**

1. **Network AP Isolation (Most Common at Venues):**
   - WiFi router blocking peer-to-peer communication
   - Common on guest/public WiFi networks
   - **No fix without network admin access**
   - HTTP fallback should activate automatically

2. **Firewall blocking WebRTC:**
   - Check browser console for WebRTC errors
   - Test on different network
   - Verify WebRTC works: https://test.webrtc.org/

3. **Different magnet URIs:**
   ```javascript
   // Verify all viewers receiving same magnet
   console.log('Received magnet:', message.magnet);
   ```
   - All viewers must have identical magnet URI for same chunk
   - If different, problem is in broadcaster seeding

4. **Tracker unreachable:**
   ```bash
   # Test tracker connectivity
   wscat -c wss://tracker.openwebtorrent.com
   ```
   - If fails, tracker is down or blocked
   - Add alternative trackers in `.env`: `TRACKER_URLS`

5. **Browser blocking WebRTC:**
   - Check browser privacy settings
   - Try Chrome (best WebRTC support)
   - Safari has limited WebRTC support (HTTP fallback expected)

**Verification that P2P is working:**
```javascript
// Monitor P2P transfer
state.wtClient.on('download', (bytes) => {
  console.log('Downloaded', bytes, 'bytes via P2P');
});

// If you see bytes increasing → P2P working!
// If not → Using HTTP fallback
```

---

### Problem: P2P Works Initially Then Stops

**Symptoms:**
- First few chunks download via P2P
- Then switches to HTTP fallback
- Peer count drops to 0

**Causes:**

1. **Chunk retention expired:**
   - Broadcaster stops seeding old chunks after `CHUNK_RETENTION_MINUTES`
   - New viewers trying to download old chunks find no seeds
   - **This is normal behavior**
   - Solution: Increase retention time in `.env`

2. **Consecutive P2P failures threshold:**
   - After 3 failures (default), viewer switches to HTTP-only mode
   - Check `CONFIG.httpFallbackThreshold` in `player.js`
   - Can increase threshold or reduce timeout

3. **Network changed:**
   - Viewer switched from WiFi to cellular (mobile)
   - Different network, can't reach previous peers
   - **Expected behavior**

---

### Problem: High P2P Download but Video Still Stutters

**Symptoms:**
- P2P bytes increasing
- Peer count > 0
- Video still buffers

**Causes:**
- P2P slower than needed for bitrate
- Peers have slow upload speed
- Not enough seeders

**Solutions:**

1. **Use HTTP fallback for important viewers:**
   - Manually set `state.mode = 'http'` in console
   - Or modify `player.js` to prefer HTTP

2. **Reduce stream bitrate:**
   - Lower bitrate in Owncast settings
   - Makes P2P more viable for slow connections

3. **Increase buffer target:**
   - Edit `player.js`: `CONFIG.bufferTarget = 5` (instead of 3)
   - Downloads more chunks ahead of playback

---

## Owncast Issues

### Problem: Owncast Not Creating Segments

**Symptoms:**
- OBS shows "Connected"
- Owncast admin shows "Online"
- But no `.ts` files in `data/hls/0/` directory

**Diagnosis:**
```bash
# Check if Owncast is receiving stream
curl http://localhost:8080/api/status | jq .online
# Should return: true

# Check HLS directory
ls -lht owncast/data/hls/0/ | head -20

# Check Owncast logs
tail -f owncast/data/logs/owncast.log
```

**Solutions:**

1. **Owncast still initializing:**
   - Wait 10-20 seconds after OBS connects
   - First segment takes time to encode

2. **Encoding error:**
   - Check Owncast logs for errors
   - Verify ffmpeg is installed: `ffmpeg -version`
   - Check CPU usage (encoding is CPU-intensive)

3. **Wrong HLS directory:**
   - Verify path in `.env`: `OWNCAST_DATA_PATH`
   - Should match Owncast data directory
   - Default: `../owncast/data/hls/0`

4. **Disk full:**
   ```bash
   df -h
   ```
   - If disk full, Owncast can't write segments
   - Clean old files or add storage

5. **Permissions issue:**
   ```bash
   # Check directory permissions
   ls -la owncast/data/hls/0/
   
   # Fix if needed
   chmod 755 owncast/data/hls/0/
   ```

---

### Problem: Owncast Admin Not Accessible

**Symptoms:**
- Can't access `http://localhost:8080/admin`
- Connection refused or timeout

**Solutions:**

1. **Owncast not running:**
   ```bash
   cd owncast
   ./owncast
   ```

2. **Port already in use:**
   ```bash
   sudo lsof -i :8080
   ```
   - Kill other process or change Owncast port in config

3. **Firewall:**
   ```bash
   sudo ufw allow 8080/tcp
   ```

4. **Wrong IP address:**
   - Use correct server IP if accessing remotely
   - May need to configure Owncast to listen on 0.0.0.0

---

## R2 Upload Issues

### Problem: R2 Upload Fails with 403 Forbidden

**Symptoms:**
- Broadcaster logs: `❌ R2 upload failed: 403 Forbidden`
- Chunks seed locally but don't reach R2

**Diagnosis:**
```bash
# Test R2 credentials
node -e "
require('dotenv').config();
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
(async () => {
  try {
    const cmd = new HeadObjectCommand({ 
      Bucket: process.env.R2_BUCKET_NAME, 
      Key: 'test.txt' 
    });
    await s3.send(cmd);
    console.log('✅ R2 credentials valid');
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
})();
"
```

**Solutions:**

1. **Invalid credentials:**
   - Regenerate R2 API token in Cloudflare dashboard
   - Update `.env` with new credentials
   - Restart broadcaster

2. **Wrong account ID:**
   - Verify `CLOUDFLARE_ACCOUNT_ID` in `.env`
   - Find in: Cloudflare Dashboard → R2 → Overview

3. **Insufficient permissions:**
   - R2 API token needs **Object Read & Write** permissions
   - Recreate token with correct permissions

4. **Wrong bucket name:**
   - Check `R2_BUCKET_NAME` in `.env`
   - Must match exact bucket name (case-sensitive)

---

### Problem: R2 Upload Succeeds but Files Not Found

**Symptoms:**
- Upload logs show success
- But viewer gets 404 when trying to download from R2 URL

**Diagnosis:**
```bash
# List files in R2 bucket
node -e "
require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
(async () => {
  const cmd = new ListObjectsV2Command({ 
    Bucket: process.env.R2_BUCKET_NAME, 
    Prefix: 'live/' 
  });
  const result = await s3.send(cmd);
  result.Contents?.forEach(f => console.log(f.Key, f.Size));
})();
"
```

**Solutions:**

1. **Wrong CDN hostname:**
   - Check `CDN_HOSTNAME` in `.env`
   - Should be: `your-bucket.r2.cloudflarestorage.com` or custom domain
   - Test URL in browser

2. **Bucket not public:**
   - Go to Cloudflare R2 → Your Bucket → Settings
   - Enable public access if needed
   - Or use R2 public URL instead of direct storage URL

3. **CORS not configured:**
   - Add CORS policy in R2 bucket settings (see DEPLOYMENT.md)
   - Required for browser access

4. **Key/path mismatch:**
   - Verify upload path: `R2_UPLOAD_PATH` in `.env`
   - Check constructed URL in broadcaster logs
   - Ensure path matches between upload and retrieval

---

## Network Issues

### Problem: CORS Errors in Browser Console

**Symptoms:**
- Browser console: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- Video fails to load from R2 or broadcaster HTTP

**Solutions:**

1. **R2 CORS not configured:**
   - Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS
   - Add rule allowing GET from all origins (see DEPLOYMENT.md)

2. **Broadcaster CORS missing:**
   - Verify `cors` middleware in `broadcaster/server.js`
   - Should have:
   ```javascript
   app.use(cors({
     origin: '*',
     methods: ['GET', 'HEAD', 'OPTIONS'],
   }));
   ```

3. **Nginx blocking CORS:**
   - If using Nginx reverse proxy, ensure CORS headers in config

---

### Problem: High Latency (> 60 seconds)

**Symptoms:**
- Latency indicator shows high values
- Stream feels delayed compared to reality

**Causes:**
- Too many segments in buffer
- Long segment duration
- Network delay

**Solutions:**

1. **Reduce Owncast segment length:**
   - Owncast admin → Video → Segment Length: **2 seconds** (instead of 4)
   - Trade-off: More segments = more overhead

2. **Reduce playlist size:**
   - Owncast admin → Number of segments: **3** (minimum)

3. **Reduce buffer target:**
   - Edit `player.js`: `CONFIG.bufferTarget = 2`
   - Trade-off: Less buffer = more likely to stutter

4. **Seek to live edge:**
   ```javascript
   // In viewer console
   video.currentTime = video.buffered.end(0) - 2;
   ```

---

## Performance Issues

### Problem: High CPU Usage on Broadcaster

**Symptoms:**
- CPU usage > 80%
- Server sluggish
- Chunks delayed

**Diagnosis:**
```bash
# Check CPU usage per process
htop
# or
top

# Check specific service
top -p $(pgrep -f "node.*broadcaster")
```

**Solutions:**

1. **Too many active torrents:**
   - Reduce `CHUNK_RETENTION_MINUTES` in `.env`
   - Seeds fewer chunks simultaneously

2. **Lower encoding bitrate:**
   - Reduce Owncast bitrate (Owncast admin → Video)
   - Less CPU for encoding

3. **Upgrade hardware:**
   - Use more powerful EC2 instance (e.g., c5.large)
   - Or use dedicated encoding hardware

---

### Problem: High Memory Usage

**Symptoms:**
- Memory usage growing over time
- Eventually crashes with OOM error

**Diagnosis:**
```bash
# Monitor memory
free -h

# Check per-process memory
ps aux --sort=-%mem | head -10
```

**Solutions:**

1. **Memory leak in broadcaster:**
   - Check if torrent objects are being destroyed
   - Verify `pruneOldChunk()` is running
   - Restart broadcaster periodically as workaround

2. **Too many buffered chunks:**
   - Reduce `CONFIG.maxBufferSize` in `player.js`
   - Implement more aggressive buffer cleanup

3. **PM2 memory limit:**
   - Set in `ecosystem.config.js`:
   ```javascript
   max_memory_restart: '500M',
   ```
   - PM2 will auto-restart when exceeded

---

## Platform-Specific Issues

### iOS Safari

**Expected Behavior:**
- Limited WebRTC support
- Will likely use HTTP fallback
- This is normal!

**Issues:**

1. **Video won't play:**
   - iOS requires user interaction for video with sound
   - Add mute attribute or wait for user tap

2. **Background playback stops:**
   - iOS suspends page when backgrounded
   - Expected behavior, no fix

3. **High cellular data usage:**
   - Verify HTTP fallback is using R2 CDN (efficient)
   - Consider warning users about data usage

---

### Android TV

**Testing:**
```bash
# Connect via ADB
adb connect <android-tv-ip>:5555

# View logs
adb logcat browser:V chromium:V *:S
```

**Common Issues:**

1. **Remote control navigation:**
   - Ensure viewer UI is navigable with D-pad
   - Test focus states on buttons/controls

2. **Performance issues:**
   - Android TV devices vary in power
   - Lower bitrate for older devices
   - Monitor memory: `adb shell dumpsys meminfo <package>`

---

### Fire TV Silk Browser

**Expected:**
- Limited WebRTC support
- HTTP fallback required
- May have performance issues

**Solutions:**

1. **Poor performance:**
   - Reduce video bitrate/resolution
   - Consider sideloading Chrome (better performance)

2. **Video format issues:**
   - Verify HLS compatibility
   - Test with sample HLS stream first

---

## Getting More Help

### Enable Debug Logging

```bash
# In .env
ENABLE_DEBUG_LOGGING=true

# Restart services
pm2 restart all

# View verbose logs
pm2 logs --lines 100
```

### Collect Diagnostic Information

```bash
# System info
uname -a
node --version
npm --version

# Service status
pm2 status

# Network status
netstat -an | grep -E "1935|3000|8080|5173"

# Disk space
df -h

# Recent logs
pm2 logs --lines 50 --nostream
```

### Open an Issue

Include:
- **Platform**: OS, browser, version
- **Symptoms**: What's not working
- **Logs**: Relevant error messages
- **Configuration**: .env values (redact secrets!)
- **Network**: LAN, WiFi, cellular, etc.
- **What you've tried**: Steps taken to resolve

---

## Quick Diagnostic Checklist

When something breaks, check in this order:

- [ ] Are all services running? (`pm2 status`)
- [ ] Any errors in logs? (`pm2 logs`)
- [ ] Is Owncast receiving stream? (Check admin panel)
- [ ] Are chunks being created? (`ls -lh owncast/data/hls/0/`)
- [ ] Can viewer connect to signaling? (Check browser console)
- [ ] Are chunks being seeded? (Check broadcaster logs)
- [ ] Can you access R2 URLs? (Test in browser)
- [ ] Any firewall blocks? (`sudo ufw status`)
- [ ] Network connectivity? (`ping`, `telnet`)

---

**Still stuck?** Check [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) for testing procedures, or open an issue with diagnostic info above.

