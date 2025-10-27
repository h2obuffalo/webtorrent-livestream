# How to Run the Flutter App

## Quick Start

The app is now ready to connect to your live stream on EC2!

### 1. Make Sure Dependencies Are Installed

```bash
cd flutter_viewer
flutter pub get
```

### 2. Run the App

#### Option A: Emulator
```bash
flutter emulators
flutter emulators --launch <emulator_name>
flutter run
```

#### Option B: Physical Device
```bash
# Connect your device via USB
# Enable USB debugging on Android
flutter devices
flutter run -d <device_id>
```

#### Option C: Chrome (Web)
```bash
flutter run -d chrome
```

### 3. Test the Stream

1. App launches → Shows splash screen
2. Navigate to main menu
3. Click "WATCH STREAM" button
4. Video should start playing from `https://tv.danpage.uk/live/playlist.m3u8`

## What the App Does

The `SimplePlayerScreen` connects directly to your production HLS manifest:

```dart
https://tv.danpage.uk/live/playlist.m3u8
```

It uses `better_player` package which:
- Supports HLS playback
- Has built-in controls (play, pause, mute, fullscreen)
- Handles live streaming well
- Works on Android, iOS, and Web

## Troubleshooting

### "Unable to Play Stream" Error

1. **Check if stream is live:**
   ```bash
   curl https://tv.danpage.uk/live/playlist.m3u8
   ```
   Should return an M3U8 playlist file.

2. **Check EC2 services are running:**
   ```bash
   ssh your-ec2-server
   pm2 status
   ```
   Should show broadcaster, signaling, and owncast running.

3. **Check Cloudflare tunnel:**
   Make sure the tunnel is active on EC2.

### Build Errors

If you get build errors:

```bash
# Clean and rebuild
cd flutter_viewer
flutter clean
flutter pub get
flutter run
```

### Android TV Specific

For Android TV, you may need to add in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-feature android:name="android.software.leanback" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
```

## Next Steps

Once video is playing:

1. Test on different devices (phone, tablet, Android TV)
2. Add stats overlay (show chunk count, latency, etc.)
3. Implement full P2P integration (download chunks via WebTorrent)
4. Add Chromecast support
5. Polish UI with your retro-cyberpunk theme

## Architecture

```
Flutter App
    ↓
SimplePlayerScreen
    ↓
BetterPlayer (package)
    ↓
HLS Manifest: https://tv.danpage.uk/live/playlist.m3u8
    ↓
Cloudflare Tunnel
    ↓
EC2 Instance
    ├── Broadcaster (serves HLS)
    ├── Signaling (WebSocket)
    └── Owncast (HLS encoder)
```

The app is production-ready for basic streaming! 🎥
