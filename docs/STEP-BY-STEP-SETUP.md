# Step-by-Step Setup Guide - Get Everything Running

## 🎯 Goal
Get your P2P live streaming working end-to-end:
- Owncast (RTMP → HLS)
- Broadcaster (seeds torrents, uploads to R2)
- Signaling (coordinates peers)
- Viewer (watches with P2P)

**Time Required:** ~30-45 minutes

---

## ✅ Prerequisites Check

Before starting, verify you have:
- [ ] macOS (you're on darwin 23.6.0 ✅)
- [ ] Node.js installed (`node --version` should show v16+)
- [ ] OBS Studio installed
- [ ] Cloudflare account (for R2)
- [ ] `.env` file with R2 credentials (you have this ✅)

---

## 📋 Step 1: Install Dependencies (5 min)

**What:** Install all Node.js packages for the project

**Commands:**
```bash
cd /Users/ran/webtorrent-livestream

# Install broadcaster dependencies
cd broadcaster && npm install && cd ..

# Install signaling dependencies  
cd signaling && npm install && cd ..

# Install viewer dependencies
cd viewer && npm install && cd ..

# Verify installations
echo "✅ All dependencies installed!"
```

**Expected Output:**
- No errors
- Packages installed in `node_modules/` folders

**If Errors:**
- Node version too old: `brew upgrade node`
- Permission issues: Don't use `sudo`, check folder permissions

---

## 📋 Step 2: Setup Owncast (10 min)

**What:** Install Owncast - turns RTMP stream into HLS chunks

### 2.1: Download Owncast

```bash
cd ~
curl -s https://owncast.online/install.sh | bash

# This will create ~/owncast directory
```

**Alternative (manual download):**
```bash
cd ~
wget https://github.com/owncast/owncast/releases/latest/download/owncast-macos-64bit.zip
unzip owncast-macos-64bit.zip -d owncast
chmod +x owncast/owncast
```

### 2.2: Start Owncast

```bash
cd ~/owncast
./owncast
```

**Expected Output:**
```
Owncast v0.1.x
Server is running on port 8080
Admin interface: http://localhost:8080/admin
Stream available at: http://localhost:8080
RTMP endpoint: rtmp://localhost:1935
```

**✅ Success Check:**
- Open http://localhost:8080/admin
- You should see Owncast admin interface
- Default username: `admin`
- Default password: `abc123` (change this!)

### 2.3: Configure Owncast

**In the admin interface (http://localhost:8080/admin):**

1. **Go to Settings → General**
   - Set server name: "BangFace Live Stream"
   - Set description
   - Click "Save"

2. **Go to Settings → Video**
   - Output Quality: Select "High (720p)"
   - Disable lower qualities if bandwidth isn't an issue
   - Click "Save"

3. **Go to Settings → Storage**
   - Number of segments to keep: `10` (keeps last ~60 seconds)
   - Click "Save"

4. **Note Your Stream Key:**
   - Go to Settings → General
   - Copy the "Stream Key" - you'll need this for OBS!

**✅ Success Check:**
- Settings saved successfully
- Stream key copied

**⚠️ Keep Owncast Running** - Open a new terminal for next steps!

---

## 📋 Step 3: Verify .env Configuration (2 min)

**What:** Check your Cloudflare R2 credentials are set

```bash
cd /Users/ran/webtorrent-livestream
cat .env
```

**Required Variables:**
```bash
# R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
CDN_HOSTNAME=your_bucket.r2.cloudflarestorage.com

# Owncast Configuration
OWNCAST_DATA_PATH=/Users/ran/owncast/data/hls

# Optional (defaults usually fine)
HTTP_PORT=3000
WS_PORT=8080
SIGNALING_URL=ws://localhost:8080
```

**✅ Success Check:**
- All R2 variables have actual values (not `your_*`)
- `OWNCAST_DATA_PATH` points to ~/owncast/data/hls

**If Missing Values:**
```bash
nano .env
# Add your Cloudflare R2 credentials
# Save: Ctrl+X, Y, Enter
```

---

## 📋 Step 4: Start Broadcaster Service (2 min)

**What:** Monitors Owncast output, seeds torrents, uploads to R2

**Open a new terminal:**
```bash
cd /Users/ran/webtorrent-livestream/broadcaster
npm start
```

**Expected Output:**
```
🚀 Broadcaster starting...
✅ Cloudflare R2 connection verified
📡 Monitoring: /Users/ran/owncast/data/hls
🌐 HTTP server listening on port 3000
⏳ Waiting for chunks from Owncast...
```

**✅ Success Check:**
- "R2 connection verified" appears
- No error messages
- Service is waiting for chunks

**Common Issues:**
- ❌ "R2 connection failed" → Check `.env` credentials
- ❌ "Directory not found" → Verify `OWNCAST_DATA_PATH` in `.env`
- ❌ "Port 3000 in use" → Change `HTTP_PORT` in `.env`

**⚠️ Keep Running** - Open a new terminal for next step!

---

## 📋 Step 5: Start Signaling Server (2 min)

**What:** WebSocket server that coordinates peers

**Open a new terminal:**
```bash
cd /Users/ran/webtorrent-livestream/signaling
npm start
```

**Expected Output:**
```
🔌 Signaling server starting...
✅ WebSocket server listening on port 8080
💬 Ready for broadcaster and viewer connections
```

**✅ Success Check:**
- Server listening on port 8080
- No error messages

**Common Issue:**
- ❌ "Port 8080 in use" → Owncast uses 8080! Change `WS_PORT` in `.env` to 8081

**⚠️ Keep Running** - Open a new terminal for next step!

---

## 📋 Step 6: Start Viewer Dev Server (2 min)

**What:** The web viewer where people watch the stream

**Open a new terminal:**
```bash
cd /Users/ran/webtorrent-livestream/viewer
npm run dev
```

**Expected Output:**
```
VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/

Press h to show help, q to quit
```

**✅ Success Check:**
- Vite dev server running
- URL shown: http://localhost:5173/

**Open in browser:**
```bash
open http://localhost:5173/
```

Or just visit: http://localhost:5173/ in Chrome/Firefox

**⚠️ Keep Running** - You now have 4 terminals open!

---

## 📋 Step 7: Configure OBS Studio (5 min)

**What:** Set up OBS to stream to Owncast

### 7.1: Open OBS Studio

Launch OBS Studio application

### 7.2: Configure Stream Settings

1. **OBS → Settings (⌘+,)  → Stream**
   
   **Settings:**
   - Service: `Custom`
   - Server: `rtmp://localhost:1935`
   - Stream Key: `[paste from Owncast admin]`
   
   Click **OK**

2. **OBS → Settings → Output**
   
   **Output Mode:** `Advanced`
   
   **Streaming Tab:**
   - Encoder: `x264` (or hardware encoder if available)
   - Bitrate: `2500 Kbps`
   - Keyframe Interval: `2`
   - CPU Usage: `veryfast` or `fast`
   
   Click **OK**

3. **OBS → Settings → Video**
   
   **Settings:**
   - Base Resolution: `1920x1080` (or your screen resolution)
   - Output Resolution: `1280x720`
   - FPS: `30`
   
   Click **OK**

### 7.3: Add a Source (Optional)

If OBS is blank, add a source:
- **Sources → + → Display Capture** (screen share)
- Or **Video Capture Device** (webcam)
- Or **Window Capture** (specific window)

**✅ Success Check:**
- OBS shows your stream settings
- Source is visible in preview

---

## 📋 Step 8: Start Streaming! (1 min) 🎬

**The Moment of Truth!**

### 8.1: Start the Stream

In OBS:
1. Click **"Start Streaming"** button
2. Wait 5-10 seconds

### 8.2: Watch the Logs

**Owncast terminal** should show:
```
📹 Stream connected
🎥 Publishing stream
```

**Broadcaster terminal** should show:
```
📦 New chunk detected: stream0.ts
🌱 Seeding via WebTorrent...
✅ Seeding: abc123def456...
☁️  Uploading to R2...
✅ R2 upload complete: stream0.ts
📡 Sent magnet to signaling server
```

**Signaling terminal** should show:
```
📨 Received chunk from broadcaster
📤 Broadcasting to 0 viewers
```

**✅ Success Check:**
- Owncast shows "Publishing stream"
- Broadcaster shows "New chunk detected"
- Chunks being seeded and uploaded

---

## 📋 Step 9: Watch the Stream (1 min) 🎉

### 9.1: Open Viewer

Browser should already be open at: http://localhost:5173/

**You should see:**
- "Connected to signaling server" ✅
- Video player loading
- **Video starts playing!** 🎉

### 9.2: Check Browser Console

Press **F12** (or ⌘+Option+I on Mac) to open DevTools

**Look for:**
```
✅ Connected to signaling server
📦 Received chunk: stream0.ts
🌱 Attempting to download via P2P...
⬇️ Downloaded chunk via HTTP (no peers yet)
▶️ Playing chunk 0
```

**✅ Success Check:**
- Video is playing
- ~30-60 second delay (normal for HLS)
- Console shows chunk downloads

---

## 📋 Step 10: Test P2P (5 min) 🌐

**What:** Verify peers can share chunks

### 10.1: Open Multiple Tabs

**Open 2-3 more tabs** to the same URL:
- http://localhost:5173/ (Tab 2)
- http://localhost:5173/ (Tab 3)

### 10.2: Watch Console Logs

In **any tab console**, you should see:
```
🤝 Connected to peer! (peer count: 2)
📥 Downloading chunk 5 from peer xyz123
✅ Downloaded 234KB via P2P
```

### 10.3: Check Stats

The viewer should show stats:
- **Peers:** 2 (or however many tabs you opened)
- **P2P Downloaded:** Increasing
- **HTTP Downloaded:** Also increasing (each peer gets some chunks via HTTP)
- **P2P Ratio:** Should be > 0% and growing

**✅ Success Check:**
- Multiple tabs all playing video
- Peer count > 0
- P2P downloads happening
- Chunks being shared between tabs

---

## 🎉 Success! Everything is Working!

You now have:
- ✅ Owncast receiving RTMP from OBS
- ✅ OBS streaming to Owncast
- ✅ Broadcaster seeding chunks via P2P
- ✅ Broadcaster uploading to R2
- ✅ Signaling coordinating peers
- ✅ Viewer(s) watching with P2P sharing

---

## 📊 Monitoring Your Stream

### Check Owncast
- Admin: http://localhost:8080/admin
- View current viewers, bitrate, etc.

### Check Broadcaster Metrics
- HTTP: http://localhost:3000/metrics
- Shows chunks seeded, peers, uploads

### Check Signaling Status
- Console logs show peer connections
- Can add a `/status` endpoint later

### Check Viewer Stats
- Browser console (F12)
- On-page stats display
- P2P ratio, download speeds, peers

---

## 🛑 How to Stop Everything

When done testing:

```bash
# Stop OBS: Click "Stop Streaming"

# Stop each service (in each terminal):
Ctrl+C

# Or stop all at once (if using PM2 later):
pm2 stop all
```

---

## 🚀 Next Steps

### For Testing:
1. **Test from other devices**
   - Phone on same WiFi
   - Another computer
   - Verify P2P works cross-device

2. **Test with Cloudflare Tunnel** (you set this up before!)
   - Access via https://tv.danpage.uk
   - Test from outside your network

3. **Monitor performance**
   - Watch CPU/memory usage
   - Check P2P ratio increases
   - Verify R2 uploads working

### For Production:
1. **Deploy to AWS** (when ready)
   - See `docs/DEPLOYMENT.md`
   - Use PM2 for process management

2. **Set up monitoring**
   - Add analytics
   - Set up alerts

3. **Test at venue**
   - Bandwidth test
   - Peer connection test
   - Latency measurement

---

## ❓ Troubleshooting

### Video Not Playing

**Check:**
1. Is OBS streaming? (green light in bottom right)
2. Is Owncast receiving? (check admin panel)
3. Is broadcaster detecting chunks? (check logs)
4. Are there chunks in `~/owncast/data/hls`?

**Commands:**
```bash
# Check if Owncast is creating chunks
ls -la ~/owncast/data/hls/

# Should see .ts files and .m3u8 files
```

### No P2P Connections

**Check:**
1. Are multiple tabs/viewers open?
2. Are they all on the same stream?
3. Check browser console for WebRTC errors
4. Try different browsers

### Broadcaster Not Detecting Chunks

**Check:**
1. Is `OWNCAST_DATA_PATH` correct in `.env`?
2. Is Owncast actually creating chunks?
3. Check broadcaster logs for errors

```bash
# Verify path exists
ls -la ~/owncast/data/hls/
```

### R2 Upload Failing

**Check:**
1. Are R2 credentials correct in `.env`?
2. Test R2 connection:

```bash
cd /Users/ran/webtorrent-livestream/broadcaster
node -e "
require('dotenv').config({ path: '../.env' });
const { verifyR2Connection } = require('./r2-uploader');
verifyR2Connection().then(() => console.log('✅ R2 OK')).catch(e => console.error('❌', e));
"
```

### Port Conflicts

If you get "port already in use" errors:

**Change ports in `.env`:**
```bash
HTTP_PORT=3001      # Broadcaster (default 3000)
WS_PORT=8081        # Signaling (default 8080, conflicts with Owncast!)
```

**Or find what's using the port:**
```bash
lsof -i :8080
# Kill if needed: kill -9 [PID]
```

---

## 📋 Quick Reference

### Service Startup Commands

```bash
# Owncast
cd ~/owncast && ./owncast

# Broadcaster
cd /Users/ran/webtorrent-livestream/broadcaster && npm start

# Signaling
cd /Users/ran/webtorrent-livestream/signaling && npm start

# Viewer
cd /Users/ran/webtorrent-livestream/viewer && npm run dev
```

### Important URLs

- **Owncast Admin:** http://localhost:8080/admin
- **Owncast Stream:** http://localhost:8080
- **Viewer:** http://localhost:5173
- **Broadcaster Metrics:** http://localhost:3000/metrics
- **Cloudflare Tunnel:** https://tv.danpage.uk (if configured)

### Key Directories

- **Owncast Data:** `~/owncast/data/hls/`
- **Project Root:** `/Users/ran/webtorrent-livestream/`
- **Config:** `/Users/ran/webtorrent-livestream/.env`

---

## ✅ Checklist Summary

- [ ] Dependencies installed
- [ ] Owncast downloaded and running
- [ ] Owncast configured (stream key copied)
- [ ] `.env` file has R2 credentials
- [ ] Broadcaster running (R2 verified)
- [ ] Signaling running
- [ ] Viewer dev server running
- [ ] OBS configured with stream settings
- [ ] OBS streaming to Owncast
- [ ] Video playing in viewer
- [ ] Multiple tabs showing P2P connections
- [ ] P2P ratio > 0%

**All checked?** 🎉 **You're live streaming with P2P!**

---

**Last Updated:** October 24, 2025  
**Status:** Ready to follow  
**Estimated Time:** 30-45 minutes  

**Good luck! 🚀**

