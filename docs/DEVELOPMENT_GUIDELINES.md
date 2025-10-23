# WebTorrent Live Streaming - Development Guidelines

## 🚨 RULE #1: Never Commit or Document as "Fixed" Before Cross-Platform Testing

**CRITICAL DEVELOPMENT RULE**: Do not commit changes with "fix" messages or create documentation files with "FIX" in the name until you have:

1. ✅ Tested on **ALL target platforms**:
   - Chrome (Desktop)
   - Safari (Desktop & iOS)
   - Firefox (Desktop)
   - Android Chrome (Phone)
   - Android TV (Chrome/WebView)
   - Fire TV Silk Browser
   - Any other target platforms

2. ✅ Verified the issue is **actually resolved** on each platform

3. ✅ Confirmed no new issues were introduced

### Why This Rule Exists:

- Changes that "should work" often fail on specific platforms
- Early commits create misleading git history
- Documentation with "FIX" in the title implies completion when issue may still exist
- Forces proper testing discipline
- Prevents premature celebration and wasted rollback effort

### Correct Workflow:

```
❌ BAD:
1. Make code change
2. git commit -m "fix: P2P connection issue resolved"
3. Create "P2P-CONNECTION-FIX.md" documentation
4. Test platforms
5. Discover it doesn't work on Fire TV
6. Revert and try again

✅ GOOD:
1. Make code change
2. Test on Chrome Desktop
3. Test on Safari Desktop
4. Test on iOS Safari
5. Test on Android Chrome
6. Test on Android TV
7. Test on Fire TV
8. Confirm ALL platforms work
9. THEN commit with "fix:" message
10. THEN create documentation with "FIX" in name
```

### Temporary Testing Commits:

If you need to checkpoint progress while testing:

```bash
# Use WIP (Work In Progress) prefix
git commit -m "wip: testing WebTorrent peer discovery optimization"

# Or use "test:" prefix
git commit -m "test: implement P2P timeout fallback - needs platform testing"

# Later, after confirming fix on all platforms:
git commit -m "fix: implement P2P timeout fallback to HTTP

Tested and confirmed working on:
- Chrome Desktop ✅
- Safari Desktop ✅
- iOS Safari ✅
- Android Chrome ✅
- Android TV ✅
- Fire TV ✅"
```

### Documentation Files:

- **During testing**: Use names like `P2P-INVESTIGATION.md` or `TESTING-NOTES.md`
- **After verification**: Rename to `P2P-FIX.md` with platform test results

---

## 🚨 CRITICAL: Always Test External URLs Before Using Them

**NEVER assume external test streams, CDN URLs, or public files work without verification.**

### Rule: Test URL Availability FIRST

Before using ANY external URL in code, test pages, or documentation:

1. **Check with curl/browser**: Verify the URL returns 200 OK
2. **Check in network tab**: Inspect actual response headers and status codes
3. **Test from target environment**: URLs might work locally but fail from tunnel/production
4. **Document the test**: Add URL test to code comments or docs

### Example of What Went Wrong:

```javascript
// ❌ BAD - Used without testing
const streamUrl = 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8';
// Result: Returns 404, wasted hours debugging "P2P issues" that were actually bad URLs
```

```bash
# ✅ GOOD - Test first
$ curl -I https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8
HTTP/1.1 404 Not Found  # ← Found the problem BEFORE wasting time!

# Find a working URL:
$ curl -I https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
HTTP/2 200 OK  # ← This one works!
```

### Testing Checklist for External URLs:

```bash
# 1. Basic availability test
curl -I <URL>  # Must return 200 OK

# 2. CORS headers check (for browser requests)
curl -I -H "Origin: http://localhost:8000" <URL> | grep -i "access-control"
# Must have: Access-Control-Allow-Origin header

# 3. Content size check
curl -s <URL> | wc -c
# Must return non-zero size

# 4. Content type check
curl -I <URL> | grep -i "content-type"
# Must match expected type (video/mp2t, application/x-mpegurl, etc.)
```

### Common External URL Issues:

1. **Stream expired/moved**: Test streams often have short lifespans
2. **Geo-restrictions**: URL works in one region, fails in another
3. **CORS not configured**: Works with direct access, fails from browser
4. **Rate limiting**: Works for first few requests, then blocks
5. **HTTPS/HTTP mismatch**: Browser blocks mixed content

### The Lesson:

**It's NEVER obvious a URL is broken without checking dev tools network tab or curl.**

Status 404 can look like:
- "P2P not working"
- "HLS.js error"
- "Fragment load timeout"

Always check the **actual HTTP response** before debugging anything else.

---

## 🚨 CRITICAL: Always Test Changes - Don't Assume They Work

When making any code changes, **ALWAYS test the actual functionality after making changes** rather than assuming they work.

### Required Testing Protocol:

1. **Make the code change**
2. **Restart services if needed** (broadcaster, signaling, viewer rebuild)
3. **Test with actual connections**
4. **Show the real results** (console logs, network tab, peer counts)
5. **Verify the change actually works before declaring success**

### Essential Test Commands:

```bash
# Test signaling WebSocket connection
wscat -c ws://localhost:8080

# Test broadcaster HTTP endpoint
curl -I http://localhost:3000/chunks/chunk00001.mp4

# Test R2 upload verification
node -e "require('dotenv').config(); const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3'); const s3 = new S3Client({ region: 'auto', endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }); (async () => { try { const cmd = new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: 'live/chunk00001.ts' }); const result = await s3.send(cmd); console.log('✅ File exists:', result.ContentLength, 'bytes'); } catch (e) { console.log('❌ File not found:', e.message); } })();"

# Test WebTorrent magnet URI creation
node -e "const WebTorrent = require('webtorrent-hybrid'); const client = new WebTorrent(); client.seed('./test.mp4', (torrent) => { console.log('Magnet URI:', torrent.magnetURI); process.exit(0); });"
```

### What to Test When:

- **Broadcaster changes** → Test chunk generation, seeding, R2 uploads
- **Signaling changes** → Test WebSocket connections, message distribution
- **Viewer changes** → Test P2P downloads, HTTP fallback, playback
- **Configuration changes** → Test all services with new config
- **Network changes** → Test port accessibility, CORS headers, peer discovery

### Why This Matters:

1. **Prevents Assumptions** - Code changes don't always work as expected
2. **Catches Issues Early** - Problems surface immediately rather than later
3. **Provides Proof** - Actual results show what's really happening
4. **Saves Time** - Avoids back-and-forth debugging when something doesn't work

### Bad Pattern (Don't Do This):
- Make change
- Say "this should work now"
- Assume it's fixed

### Good Pattern (Always Do This):
- Make change
- Restart services if needed
- Test with actual commands/browser
- Show the real results
- Confirm the change works before declaring success

---

## 🌐 WebTorrent-Specific Testing

### CRITICAL: Always Verify P2P Functionality

WebTorrent P2P connections can fail silently or appear to work while actually using fallback mechanisms. Always verify actual P2P transfer.

### WebTorrent Testing Protocol:

#### 1. Verify Magnet URI Generation:

```bash
# Check that magnet URIs are valid and unique per chunk
# Expected format: magnet:?xt=urn:btih:<infohash>&dn=<name>&tr=<tracker>

# Test in broadcaster console:
console.log('Generated magnet:', torrent.magnetURI);
console.log('InfoHash:', torrent.infoHash);
console.log('Number of peers:', torrent.numPeers);
```

#### 2. Test Peer Discovery:

```bash
# Open two browsers side-by-side
# Browser 1: Start viewer, note peer count (should be 0 initially)
# Browser 2: Start viewer, check both peer counts (should increase to 1+ each)

# In browser console:
console.log('Active torrents:', client.torrents.length);
console.log('Peers per torrent:', client.torrents.map(t => t.numPeers));
```

#### 3. Verify Chunk Integrity:

```bash
# Test that chunks are different (not serving same file repeatedly)
for i in {1..5}; do
  curl -s "http://localhost:3000/chunks/chunk0000${i}.ts" | wc -c
done

# Expected: Different file sizes for each chunk
# If all the same size → Problem with chunk generation or serving!
```

#### 4. Test Tracker Connectivity:

```bash
# Verify tracker is reachable
wscat -c wss://tracker.openwebtorrent.com

# Expected: WebSocket connection successful
# If connection fails → Tracker down or network blocking WebSocket
```

#### 5. Verify P2P Transfer (Not HTTP Fallback):

```javascript
// In viewer browser console, monitor network transfer
const originalFetch = window.fetch;
let httpFetchCount = 0;
window.fetch = function(...args) {
  if (args[0].includes('chunks/')) {
    httpFetchCount++;
    console.warn('HTTP fallback used:', httpFetchCount, 'times');
  }
  return originalFetch.apply(this, args);
};

// If httpFetchCount increases → P2P is failing, using HTTP fallback
// Expected: httpFetchCount should be 0 or minimal if P2P working
```

### Common WebTorrent Issues & Solutions:

#### Issue 1: Zero Peers Despite Multiple Viewers
**Symptom**: `torrent.numPeers === 0` on all clients
**Causes**:
1. Tracker not configured or unreachable
2. Network blocking WebRTC/WebSocket
3. Different magnet URIs per viewer (should be identical!)
4. Browser blocking WebRTC (permissions/settings)

**Solution**:
```javascript
// 1. Verify all clients getting same magnet URI
console.log('Magnet received:', msg.magnet);

// 2. Check tracker announcement
console.log('Tracker announces:', torrent.announce);

// 3. Monitor peer wire events
torrent.on('wire', (wire) => {
  console.log('New peer connected!', wire.remoteAddress);
});
```

#### Issue 2: Chunks Downloading but Not Playing
**Symptom**: Files download successfully but video stutters/fails
**Causes**:
1. MediaSource buffer management issues
2. Chunks appended out of order
3. Codec mismatch between chunks
4. Buffer full, not removing old data

**Solution**:
```javascript
// Check SourceBuffer state
console.log('Buffer updating?', sourceBuffer.updating);
console.log('Buffered ranges:', sourceBuffer.buffered.length);
console.log('Buffer start/end:', sourceBuffer.buffered.start(0), sourceBuffer.buffered.end(0));

// Remove old buffer data when full
if (sourceBuffer.buffered.length > 0) {
  const start = sourceBuffer.buffered.start(0);
  const end = sourceBuffer.buffered.end(0);
  if (end - start > 60) { // Keep only 60s buffer
    sourceBuffer.remove(start, end - 30);
  }
}
```

#### Issue 3: Magnet URI Changes Between Broadcasts
**Symptom**: Each broadcast session generates different magnets for same chunk sequence
**Expected**: This is normal! Magnet URIs are unique per torrent/file content
**Solution**: Ensure signaling server clears old magnets on new stream start

#### Issue 4: Seeding Fails Silently
**Symptom**: `client.seed()` callback never fires
**Causes**:
1. File doesn't exist or still being written
2. File path incorrect
3. Disk I/O error

**Solution**:
```javascript
// Add error handler
client.seed(filePath, { announce: trackers }, (torrent) => {
  console.log('✅ Seeding:', torrent.name);
});

client.on('error', (err) => {
  console.error('❌ WebTorrent error:', err);
});

// Verify file exists before seeding
const fs = require('fs');
if (fs.existsSync(filePath)) {
  console.log('File size:', fs.statSync(filePath).size);
} else {
  console.error('File not found:', filePath);
}
```

---

## 📦 Cloudflare R2 File Operations Testing

### CRITICAL: Always Verify R2 File Integrity

When uploading files to R2 or modifying R2 file fetching logic, **ALWAYS test that files are correctly stored and retrieved**.

### R2 Testing Protocol:

#### 1. After Uploading Files to R2:

```bash
# Verify files exist in R2 with correct sizes using AWS SDK
node -e "
require('dotenv').config();
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const keys = [
  'live/chunk00001.ts',
  'live/chunk00002.ts',
  'live/chunk00003.ts'
];

(async () => {
  for (const key of keys) {
    try {
      const cmd = new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
      const meta = await s3.send(cmd);
      console.log(\`✅ \${key}: \${meta.ContentLength} bytes\`);
    } catch (e) {
      console.log(\`❌ \${key}: ERROR - \${e.message}\`);
    }
  }
})();
"
```

#### 2. Test File Retrieval via CDN:

```bash
# Test that chunks are unique (different file sizes)
for chunk in chunk00001 chunk00002 chunk00003; do 
  echo -n "$chunk: " 
  curl -s "https://tv.danpage.uk/live/${chunk}.ts" | wc -c
done

# Expected: Different file sizes for each chunk
# If all the same size → Files NOT properly stored/retrieved!
```

#### 3. Test Chunk Sequence:

```bash
# List all chunks in R2
node -e "require('dotenv').config(); const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3'); const s3 = new S3Client({ region: 'auto', endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }); (async () => { const cmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'live/' }); const result = await s3.send(cmd); result.Contents.forEach(f => console.log(f.Key, f.Size)); })();"

# Expected: Chronological sequence of chunks with varying sizes
```

### Common R2 Issues & Solutions:

#### Issue 1: Upload Succeeds but File Not Found
**Symptom**: `PutObject` returns success, but `GetObject` returns 404
**Cause**: R2 eventual consistency (usually < 1 second)
**Solution**: 
```javascript
// Add small delay before seeding/serving
await new Promise(resolve => setTimeout(resolve, 500));
```

#### Issue 2: All Files Returning Same Content
**Symptom**: All chunks have identical file size
**Cause**: Using wrong key or overwriting same file
**Solution**: 
```javascript
// Ensure unique keys per chunk
const key = `live/chunk${Date.now()}_${sequence}.ts`;
console.log('Uploading to key:', key);
```

#### Issue 3: CORS Errors When Fetching from R2
**Symptom**: Browser shows CORS error for R2 URLs
**Solution**: Configure R2 bucket CORS policy:
```bash
# Set CORS rules on R2 bucket via Cloudflare dashboard:
# Allowed Origins: *
# Allowed Methods: GET, HEAD
# Allowed Headers: *
# Max Age: 3600
```

#### Issue 4: Large Files Timing Out
**Symptom**: Upload fails for chunks > 5MB
**Solution**: Use multipart upload for large files:
```javascript
const { Upload } = require('@aws-sdk/lib-storage');

const upload = new Upload({
  client: s3Client,
  params: {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
  },
});

await upload.done();
```

---

## 🔧 Owncast Integration Testing

### Verify Owncast HLS Output

When integrating with Owncast, ensure the broadcaster service correctly monitors and processes Owncast's HLS output.

#### 1. Check Owncast Data Directory Structure:

```bash
# Owncast default data structure
# data/
#   hls/
#     stream.m3u8          # Master playlist
#     0/                   # Stream variant
#       stream.m3u8        # Variant playlist
#       stream0.ts         # Segment 0
#       stream1.ts         # Segment 1
#       ...

# Verify directory structure
ls -lh /path/to/owncast/data/hls/0/

# Expected: Sequence of .ts files being created continuously
```

#### 2. Monitor File Creation:

```bash
# Watch for new segment creation (macOS)
fswatch -0 /path/to/owncast/data/hls/0/ | while read -d "" file; do
  echo "New file: $file ($(stat -f%z "$file") bytes)"
done

# Linux alternative
inotifywait -m /path/to/owncast/data/hls/0/ -e create
```

#### 3. Test Playlist Parsing:

```javascript
// Test reading Owncast playlist
const fs = require('fs');
const playlistPath = '/path/to/owncast/data/hls/0/stream.m3u8';

fs.readFile(playlistPath, 'utf8', (err, data) => {
  console.log('Playlist content:', data);
  
  // Extract segment filenames
  const segments = data.match(/stream\d+\.ts/g);
  console.log('Current segments:', segments);
});
```

#### 4. Verify Segment Compatibility:

```bash
# Test segment is valid HLS TS format
ffprobe /path/to/owncast/data/hls/0/stream0.ts

# Expected: Shows codec, duration, bitrate
# If error → Owncast encoding issue
```

---

## 🎯 Platform Compatibility Checklist

### Browser Testing Matrix:

| Platform | Browser | WebTorrent | MSE | WebRTC | Notes |
|----------|---------|------------|-----|--------|-------|
| **Desktop** |
| Windows | Chrome 90+ | ✅ | ✅ | ✅ | Full support |
| Windows | Firefox 88+ | ✅ | ✅ | ✅ | Full support |
| Windows | Edge 90+ | ✅ | ✅ | ✅ | Chromium-based |
| macOS | Chrome 90+ | ✅ | ✅ | ✅ | Full support |
| macOS | Safari 14+ | ⚠️ | ✅ | ⚠️ | Limited WebRTC, prefer HTTP fallback |
| macOS | Firefox 88+ | ✅ | ✅ | ✅ | Full support |
| Linux | Chrome 90+ | ✅ | ✅ | ✅ | Full support |
| Linux | Firefox 88+ | ✅ | ✅ | ✅ | Full support |
| **Mobile** |
| iOS 14+ | Safari | ⚠️ | ✅ | ⚠️ | WebRTC limited, test extensively |
| iOS 14+ | Chrome | ⚠️ | ✅ | ⚠️ | Uses Safari engine |
| Android 8+ | Chrome | ✅ | ✅ | ✅ | Full support |
| Android 8+ | Firefox | ✅ | ✅ | ✅ | Full support |
| **Smart TV** |
| Android TV | Chrome/WebView | ✅ | ✅ | ⚠️ | Test on actual hardware |
| Fire TV | Silk Browser | ⚠️ | ✅ | ❌ | Likely needs HTTP fallback |
| Fire TV | Chrome (sideload) | ✅ | ✅ | ⚠️ | Better support than Silk |

**Legend:**
- ✅ Full support, expected to work
- ⚠️ Partial support, test carefully
- ❌ No support, must use fallback

### Testing Protocol per Platform:

#### Desktop Chrome/Firefox:
1. Open viewer page
2. Check console for WebTorrent peer connections
3. Verify P2P badge shows > 0 peers
4. Monitor Network tab - should NOT see chunk HTTP requests (if P2P working)
5. Test playback smoothness
6. Test seeking/scrubbing

#### Safari Desktop/iOS:
1. Open viewer page
2. Expect HTTP fallback (Safari WebRTC support limited)
3. Verify video plays from R2 CDN URLs
4. Test playback on both WiFi and cellular (iOS)
5. Test background/foreground switching (iOS)
6. Check for CORS errors in console

#### Android Chrome:
1. Open viewer page via Chrome browser
2. Check browser console via `chrome://inspect`
3. Verify P2P connections (if on same network as other peers)
4. Test in both WiFi and mobile data modes
5. Test screen rotation
6. Test background/foreground switching

#### Android TV:
1. Navigate to viewer URL via built-in browser
2. Use adb logcat to monitor console: `adb logcat browser:V chromium:V *:S`
3. Test with remote control navigation
4. Verify video fills screen appropriately
5. Test for extended duration (check for memory leaks)
6. Monitor CPU/memory usage via adb

#### Fire TV:
1. Open in Silk Browser (pre-installed)
2. Expect HTTP fallback (Silk has limited WebRTC)
3. Test remote control navigation
4. Verify playback smoothness
5. If poor performance, test with sideloaded Chrome

---

## 🌐 Network & Port Testing

### Port Accessibility Verification:

Before deploying to venue, verify required ports are accessible:

```bash
# Test from a client device on venue network

# Test WebSocket signaling (port 8080)
wscat -c ws://broadcaster-ip:8080
# Expected: Connection successful, receives messages

# Test HTTP chunk delivery (port 3000)
curl -I http://broadcaster-ip:3000/chunks/test.ts
# Expected: HTTP 200 OK

# Test RTMP input (port 1935) - from OBS machine
# OBS → Settings → Stream → Server: rtmp://broadcaster-ip:1935/live
# Expected: OBS shows "Connected"

# Test WebRTC/STUN connectivity
# Open chrome://webrtc-internals/ in Chrome
# Start viewer, check for successful ICE candidates
```

### Common Network Issues:

#### Issue 1: WebSocket Connection Refused
**Symptom**: `ERR_CONNECTION_REFUSED` on ws://broadcaster:8080
**Causes**:
1. Firewall blocking port 8080
2. Signaling server not running
3. Wrong IP address

**Solution**:
```bash
# Verify signaling server is listening
netstat -an | grep 8080
# Expected: LISTEN on port 8080

# Test from broadcaster itself
wscat -c ws://localhost:8080
# If works locally but not remotely → firewall issue
```

#### Issue 2: Zero P2P Peers on Venue WiFi
**Symptom**: All clients show 0 peers despite being on same network
**Causes**:
1. WiFi AP isolation enabled (common on guest networks)
2. WebRTC ports blocked
3. VLAN separation

**Solution**:
```bash
# Test peer-to-peer connectivity between two devices
# Device A: nc -l 12345
# Device B: nc device-a-ip 12345

# If connection fails → network blocking P2P
# Solution: Use HTTP fallback or request network admin to allow P2P

# Verify HTTP fallback is working
# Check viewer console for: "P2P unavailable, using HTTP fallback"
```

#### Issue 3: CORS Errors
**Symptom**: Browser console shows "CORS policy" errors
**Solution**: Ensure proper CORS headers on all HTTP responses:

```javascript
// In Express server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.header('Accept-Ranges', 'bytes');
  next();
});
```

---

## 📝 Git Workflow & Commit Standards

### Commit Message Format:

Use conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix (only after cross-platform testing!)
- `wip:` - Work in progress
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Build process or auxiliary tool changes

**Examples:**

```bash
# Good commits
git commit -m "feat(broadcaster): add Owncast HLS monitoring"
git commit -m "wip(viewer): experiment with MSE buffer management"
git commit -m "test(signaling): add WebSocket reconnection testing"

# After full platform testing:
git commit -m "fix(viewer): implement P2P timeout with HTTP fallback

Tested and working on:
- Chrome Desktop (Windows, macOS, Linux) ✅
- Firefox Desktop ✅
- Safari Desktop ✅
- iOS Safari ✅
- Android Chrome ✅
- Android TV ✅
- Fire TV (HTTP fallback) ✅

Resolves: #42"
```

### Branch Strategy:

```
main (production-ready)
  └── develop (integration branch)
       ├── feature/owncast-integration
       ├── feature/r2-upload
       └── bugfix/p2p-timeout
```

### Pull Request Checklist:

Before submitting PR:

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Tested on required platforms (list them)
- [ ] Documentation updated if needed
- [ ] No console.log debugging statements left
- [ ] Environment variables documented in .env.example
- [ ] Breaking changes noted in PR description

---

## 🧪 Testing Checklist

### After ANY Code Change:

- [ ] Restart affected services
- [ ] Test with actual connections (not just unit tests)
- [ ] Check browser/server console for errors
- [ ] Verify expected behavior occurred
- [ ] Document what was tested

### After Broadcaster Changes:

- [ ] OBS connection succeeds
- [ ] Chunks are being created
- [ ] Chunks are being seeded (check magnet URIs)
- [ ] Chunks are being uploaded to R2
- [ ] Old chunks are being pruned
- [ ] CPU/memory usage acceptable

### After Signaling Changes:

- [ ] WebSocket connections succeed
- [ ] Manifest is sent on connection
- [ ] New chunks are broadcast to all clients
- [ ] Client count tracking works
- [ ] Reconnection handling works

### After Viewer Changes:

- [ ] WebSocket connection succeeds
- [ ] Magnet URIs are received
- [ ] P2P downloads work (check peer count)
- [ ] HTTP fallback works when P2P fails
- [ ] Video playback is smooth
- [ ] UI updates correctly (peer count, latency, status)
- [ ] Buffer management works (no memory leaks)

### Before Declaring "Complete":

- [ ] All services running
- [ ] End-to-end flow works (OBS → Broadcaster → Signaling → Viewer → Playback)
- [ ] Tested on at least 3 different platforms
- [ ] Performance acceptable (CPU, memory, bandwidth)
- [ ] Error handling works (test network interruptions)
- [ ] Logging provides useful debugging info
- [ ] Documentation updated

---

## 🚀 Quick Reference Commands

### Project Setup:

```bash
# Clone and setup
git clone <repo-url>
cd webtorrent-livestream
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your R2 credentials

# Start all services (development)
npm run dev
```

### Individual Service Commands:

```bash
# Start broadcaster
cd broadcaster && npm start

# Start signaling server
cd signaling && npm start

# Start viewer (dev server)
cd viewer && npm start

# Kill all services
pkill -f "node.*broadcaster"
pkill -f "node.*signaling"
```

### Testing Commands:

```bash
# Test WebSocket signaling
wscat -c ws://localhost:8080

# Test broadcaster HTTP
curl -I http://localhost:3000/chunks/chunk00001.ts

# Test R2 file exists
node -e "require('dotenv').config(); const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3'); const s3 = new S3Client({ region: 'auto', endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }); (async () => { const cmd = new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: 'live/chunk00001.ts' }); const result = await s3.send(cmd); console.log('File size:', result.ContentLength); })();"

# Monitor Owncast output
watch -n 1 'ls -lht /path/to/owncast/data/hls/0/ | head -20'

# Check port listening
netstat -an | grep -E "1935|3000|8080"

# Test P2P connectivity between two devices
# Device 1: nc -l 12345
# Device 2: nc <device1-ip> 12345
```

### Owncast Commands:

```bash
# Start Owncast
cd owncast && ./owncast

# Check Owncast status
curl http://localhost:8080/api/status

# Watch Owncast logs
tail -f owncast/data/logs/owncast.log

# Configure OBS for Owncast
# Server: rtmp://localhost:1935
# Stream Key: abc123 (set in Owncast admin)
```

### Debugging Commands:

```bash
# Check WebTorrent peer count
node -e "const WebTorrent = require('webtorrent-hybrid'); const client = new WebTorrent(); client.add('magnet:?...', (torrent) => { console.log('Peers:', torrent.numPeers); });"

# Monitor chunk file sizes
watch -n 1 'for i in {1..5}; do ls -lh broadcaster/chunks/chunk0000$i.ts 2>/dev/null || echo "N/A"; done'

# Check R2 bucket contents
node -e "require('dotenv').config(); const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3'); const s3 = new S3Client({ region: 'auto', endpoint: \`https://\${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }); (async () => { const cmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'live/', MaxKeys: 10 }); const result = await s3.send(cmd); result.Contents.forEach(f => console.log(f.Key, f.Size)); })();"

# Android TV debugging via ADB
adb connect <android-tv-ip>:5555
adb logcat browser:V chromium:V *:S

# Monitor network traffic
# macOS:
sudo tcpdump -i any port 8080 or port 3000
# Linux:
sudo tcpdump -i any port 8080 or port 3000
```

### Performance Monitoring:

```bash
# Check CPU/memory usage
# macOS:
top -pid $(pgrep -f "node.*broadcaster")
# Linux:
top -p $(pgrep -f "node.*broadcaster")

# Monitor network bandwidth
# macOS:
nettop -p $(pgrep -f "node.*broadcaster")
# Linux:
iftop

# Monitor disk I/O
# macOS:
sudo fs_usage -f filesys | grep chunks
# Linux:
sudo iotop
```

---

## ⚠️ Common Pitfalls & Troubleshooting

### Pitfall 1: Assuming Server Restart Fixes Everything

**Reality**: File state (chunks, R2 uploads) is independent of server state

**Solution**: Always verify files separately from server status

```bash
# Don't just restart and assume it's fixed
npm restart

# Instead, verify the actual state:
ls -lh chunks/           # Check local chunks
# Check R2 chunks
node verify-r2.js
```

### Pitfall 2: Testing Only on Your Development Machine

**Reality**: Venue networks are different (AP isolation, port blocking, VLAN separation)

**Solution**: Test on venue network before event, or simulate restricted network

```bash
# Simulate restricted network (block P2P ports)
sudo iptables -A OUTPUT -p tcp --dport 6881:6889 -j DROP
sudo iptables -A OUTPUT -p udp --dport 6881:6889 -j DROP

# Verify HTTP fallback still works
```

### Pitfall 3: Ignoring Buffer Management in MSE

**Reality**: MediaSource buffers fill up, causing playback to stall

**Solution**: Implement active buffer management

```javascript
// Monitor and clean buffer
setInterval(() => {
  if (sourceBuffer.buffered.length > 0) {
    const bufferedEnd = sourceBuffer.buffered.end(0);
    const currentTime = video.currentTime;
    
    // Remove data older than 30 seconds behind playhead
    if (bufferedEnd - currentTime > 30) {
      sourceBuffer.remove(0, currentTime - 30);
    }
  }
}, 10000);
```

### Pitfall 4: Not Testing Edge Cases

**Common edge cases to test:**
- Network interruption mid-stream
- OBS disconnects and reconnects
- Viewer joins mid-stream (not from beginning)
- All viewers leave then rejoin
- Broadcaster restarts during active stream
- R2 upload fails (credentials expired, quota exceeded)
- WebSocket connection drops and reconnects

### Pitfall 5: Logging Sensitive Information

**Don't log:**
- R2 credentials
- Full magnet URIs (can log just infohash)
- User IP addresses (GDPR concern)
- Authentication tokens

**Do log:**
- Chunk sequence numbers
- Peer counts
- Error messages
- Performance metrics

```javascript
// ❌ Bad
console.log('R2 Key:', process.env.R2_SECRET_ACCESS_KEY);
console.log('User connected from:', req.connection.remoteAddress);

// ✅ Good
console.log('Chunk uploaded:', chunkName);
console.log('Active connections:', connectionCount);
console.error('Upload failed:', error.message);
```

---

## 📚 Key Lessons & Best Practices

### Lesson 1: Test File Integrity, Not Just Existence

**Problem**: Files "exist" but contain wrong data
**Solution**: Compare file sizes, check actual content

```bash
# Not enough:
curl -I http://server/chunk.ts  # Just checks 200 OK

# Better:
curl -s http://server/chunk.ts | wc -c  # Check size
# Compare sizes between multiple chunks
```

### Lesson 2: P2P May Fail Silently

**Problem**: Viewer shows video playing, but actually using HTTP fallback
**Solution**: Monitor and display actual P2P transfer

```javascript
// Track actual transfer method
let p2pBytes = 0;
let httpBytes = 0;

torrent.on('download', (bytes) => {
  p2pBytes += bytes;
  updateUI({ p2p: p2pBytes, http: httpBytes });
});
```

### Lesson 3: CORS Must Be Configured Everywhere

**Problem**: Video works in dev, fails in production
**Cause**: Missing CORS headers on R2 or broadcaster HTTP server
**Solution**: Configure CORS on all file-serving endpoints

### Lesson 4: Platform Differences Are Real

**Problem**: Works on Chrome Desktop, fails on Fire TV Silk
**Reality**: Different browsers have different capabilities
**Solution**: Build in fallback mechanisms, test on actual devices

### Lesson 5: Network Restrictions Kill P2P

**Problem**: Perfect P2P locally, zero peers at venue
**Cause**: Guest WiFi AP isolation or port blocking
**Solution**: Always have HTTP fallback, test venue network in advance

---

## 🎯 Definition of Done

A feature is considered "done" when:

1. ✅ Code is written and passes local tests
2. ✅ Tested on all target platforms
3. ✅ HTTP fallback works (for P2P features)
4. ✅ Error handling implemented
5. ✅ Logging added for debugging
6. ✅ Documentation updated
7. ✅ Environment variables added to .env.example
8. ✅ Performance is acceptable (CPU, memory, bandwidth)
9. ✅ No sensitive information logged
10. ✅ Code reviewed by another developer
11. ✅ Committed with proper commit message
12. ✅ Deployed to staging and tested end-to-end

**Remember: Done means ACTUALLY done, not "should work" done!**

---

**Last Updated**: October 2025
**Maintainers**: Add your name when you contribute
**Questions?** Open an issue or ask in team chat

