# Standalone Test Page for Fire TV / Android TV

This is a simplified standalone test page to validate if Fire TV (Silk browser) and Android TV can handle:
1. **HLS video streaming** (what Owncast outputs)
2. **WebTorrent P2P** (for torrent-based distribution)

## Why Test First?

Before building the full infrastructure, we need to know:
- ✅ Can Fire TV Silk browser play HLS video?
- ✅ Does WebTorrent work on Fire TV?
- ✅ Can Android TV handle both?
- ✅ What fallback options do we need?

If neither technology works well on your target devices, we'll need a different approach.

---

## Quick Start

### Option 1: Test Locally (Recommended)

```bash
cd /Users/ran/webtorrent-livestream/viewer

# Start a simple HTTP server
python3 -m http.server 8000
# or
npx serve .
```

Then open on your test device:
- **Fire TV Silk**: Navigate to `http://<your-computer-ip>:8000/test-standalone.html`
- **Android TV**: Open Chrome and go to `http://<your-computer-ip>:8000/test-standalone.html`
- **Desktop**: Open `http://localhost:8000/test-standalone.html`

### Option 2: Deploy to GitHub Pages (For Remote Testing)

1. Push this file to a GitHub repo
2. Enable GitHub Pages
3. Access via the GitHub Pages URL on any device

### Option 3: Open File Directly (Limited)

Some features may not work due to CORS restrictions:
```
file:///Users/ran/webtorrent-livestream/viewer/test-standalone.html
```

---

## What to Test

### Test 1: HLS Video Streaming ✅

**What it tests**: Can the device play HLS video (`.m3u8` playlists)?

1. Click **"▶️ Play HLS Stream"** (uses default test stream)
2. Watch for:
   - ✅ Video loads and plays smoothly
   - ✅ Buffering is minimal
   - ✅ No errors in the log
   - ❌ Black screen or errors = HLS not supported

**Why it matters**: Owncast outputs HLS format. If this fails, the device can't play Owncast streams.

**Test streams included**:
- Mux Test Stream (default) - reliable test stream
- Big Buck Bunny - open source test video
- Custom URL - test your own HLS streams

### Test 2: WebTorrent P2P 🌐

**What it tests**: Can the device download and play video via WebTorrent?

1. Click **"▶️ Download & Play Torrent"** (uses Sintel movie)
2. Watch for:
   - ✅ Peer connections appear (Peers > 0)
   - ✅ Download speed increases
   - ✅ Video starts playing
   - ❌ Zero peers or errors = WebTorrent not supported

**Why it matters**: This is the P2P technology that saves bandwidth and scales to 1000 viewers.

**Test torrents included**:
- Sintel Movie (default) - short open source film
- Big Buck Bunny - another test video
- Custom magnet - test any torrent

---

## What Results Mean

### Scenario A: Both Work ✅✅
**Result**: You're good to go! Build the full system.
- HLS works = Owncast output compatible
- WebTorrent works = P2P distribution viable
- **Next step**: Continue with full infrastructure

### Scenario B: Only HLS Works ✅❌
**Result**: Use HTTP-only distribution (no P2P)
- Device can play video but not P2P
- Common on: Fire TV Silk, iOS Safari, some Android TV
- **Next step**: Use CDN/R2 only, skip WebTorrent
- Still viable for 1000 viewers with R2 (free egress)

### Scenario C: Only WebTorrent Works ❌✅
**Result**: Unlikely scenario (WebTorrent includes its own player)
- Very rare
- **Next step**: Investigate why HLS fails, may need transcoding

### Scenario D: Neither Works ❌❌
**Result**: Device can't handle modern video streaming
- Very old device or heavily restricted browser
- **Next step**: Consider alternative streaming methods:
  - Progressive download (basic HTTP video)
  - Native apps instead of web
  - Different device entirely

---

## Device-Specific Notes

### Fire TV Silk Browser
**Expected results**:
- ✅ HLS: Should work (Silk has decent video support)
- ❌ WebTorrent: Likely fails (limited WebRTC/P2P)
- **Recommendation**: HTTP fallback only for Fire TV

**How to test on Fire TV**:
1. Open Silk browser on Fire TV
2. Navigate to test page URL
3. Use Fire TV remote to click buttons
4. Watch logs at bottom of page

### Android TV
**Expected results**:
- ✅ HLS: Should work well
- ✅ WebTorrent: Should work if using Chrome
- ⚠️ WebTorrent: May fail in default browser
- **Recommendation**: Instruct users to install Chrome

**How to test on Android TV**:
1. Install Chrome on Android TV (if not default browser)
2. Navigate to test page URL
3. Use TV remote or mouse to interact
4. Monitor via `adb logcat` for detailed logs:
   ```bash
   adb connect <android-tv-ip>:5555
   adb logcat browser:V chromium:V *:S
   ```

### Desktop (For Comparison)
**Expected results**:
- ✅✅ Both should work perfectly
- Use as baseline for what "working" looks like

---

## Interpreting the Logs

### Good Signs ✅
```
✅ Metadata loaded
✅ Video ready to play
▶️ Playback started
✅ Connected to peer: X total
📥 Download speed: X KB/s
```

### Warning Signs ⚠️
```
⚠️ Native HLS not supported - loading video directly
⚠️ Autoplay failed: Click video to start
⏳ Buffering...
⚠️ Playback stalled
```
These may still work, just need user interaction or buffering

### Bad Signs ❌
```
❌ Video error: ...
❌ WebTorrent not available on this device
❌ Torrent error: ...
❌ No video file found
❌ Client error: ...
```
These indicate fundamental incompatibility

---

## Stats to Watch

### HLS Stats
- **Video State**: Should show "Playing"
- **Buffered**: Should stay > 5 seconds
- **Current Time**: Should increase smoothly

### WebTorrent Stats
- **Peers**: Should be > 0 (more is better)
- **Download Speed**: Should increase as more peers connect
- **Progress**: Should increase from 0% to 100%
- **Downloaded**: Shows how much data transferred

---

## Troubleshooting

### HLS Video Won't Play
1. **Check URL**: Ensure `.m3u8` URL is accessible
2. **Test in Desktop Browser First**: Verify stream works elsewhere
3. **Try Different Stream**: Use the preset buttons
4. **Check Device Info**: Look for "HLS Native Support"

### WebTorrent Won't Start
1. **Check Device Info**: Look for "WebTorrent: ✅ Supported"
2. **Wait for Peers**: May take 30-60 seconds to find peers
3. **Try Different Torrent**: Use preset buttons
4. **Check Network**: Ensure device has internet access
5. **Firewall**: Some networks block P2P (try different WiFi)

### Video Stutters/Buffers
1. **Check Network Speed**: Need stable connection
2. **Lower Quality**: Try different test stream
3. **Check Download Speed**: WebTorrent stats show if P2P is slow

### Can't Access from Fire TV
1. **Same Network**: Ensure Fire TV and computer on same WiFi
2. **Firewall**: Check if computer firewall blocks incoming connections
3. **IP Address**: Use actual IP, not `localhost`
   ```bash
   # Find your IP:
   ifconfig | grep "inet "  # macOS/Linux
   ipconfig  # Windows
   ```

---

## Next Steps Based on Results

### If Both Work ✅✅
1. Continue with full system setup
2. Follow main README.md
3. Build broadcaster + signaling services
4. Deploy to production

### If Only HLS Works ✅❌
1. **Simplify architecture**:
   - Skip WebTorrent components
   - Direct HLS → R2 → Viewers
   - Still very cost-effective (R2 free egress)

2. **Modified approach**:
   ```
   OBS → Owncast → Upload to R2 → Viewers
   (No P2P, pure CDN distribution)
   ```

3. **Benefits**:
   - Simpler codebase
   - More reliable (no P2P failures)
   - Still scales well with R2

4. **Create simplified version?**:
   - Let me know and I can create a non-P2P version

### If Neither Works ❌❌
1. **Consider alternatives**:
   - Native mobile apps (instead of web)
   - Progressive download (simpler HTTP video)
   - Different target devices
   - YouTube Live (easiest but least control)

2. **Investigate further**:
   - What specific errors appear?
   - Try on different devices
   - Test with different networks

---

## Example Test Results Template

Share your results in this format:

```
Device: Fire TV Stick 4K
Browser: Silk 113.2.1
Date: 2025-10-23

HLS Test:
- Status: ✅ Works
- Video loaded: Yes
- Playback smooth: Yes
- Buffering: Minimal
- Notes: Worked perfectly on first try

WebTorrent Test:
- Status: ❌ Failed
- WebTorrent available: No
- Error: "WebTorrent not available on this device"
- Notes: Expected, Silk doesn't support WebRTC

Conclusion: Use HTTP-only fallback for Fire TV devices
```

---

## Questions?

- **Does the test work on desktop?** Yes, both HLS and WebTorrent should work perfectly on Chrome/Firefox desktop
- **How long should I wait?** HLS should load in 5-10 seconds. WebTorrent may take 30-60 seconds to find peers
- **What if peers stay at 0?** Network may block P2P, or torrent has no active seeders
- **Can I test my own streams?** Yes! Use "Custom URL" preset and enter your own HLS or magnet link
- **Is this safe?** Yes, test streams are public and safe. Only test with torrents you trust.

---

## File Info

- **File**: `test-standalone.html`
- **Dependencies**: Just WebTorrent CDN (loaded automatically)
- **Size**: ~20KB
- **Works offline**: No (needs internet for test streams and torrents)
- **Mobile friendly**: Yes, responsive design

---

**Ready to test!** Open the HTML file and start clicking buttons. Report back with results from Fire TV and Android TV! 🔥📺

