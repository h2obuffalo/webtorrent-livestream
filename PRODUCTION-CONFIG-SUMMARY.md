# Production Configuration Summary

## Changes Made

Updated all URLs in the Flutter app to use your production EC2 setup via Cloudflare tunnel.

### Updated Files

1. **`flutter_viewer/lib/config/constants.dart`**
   - Changed from `ws://localhost:8080` to `wss://tv.danpage.uk/ws`
   - Added `broadcasterBaseUrl` and `hlsManifestUrl` constants
   - Now uses production HTTPS endpoints

2. **`flutter_viewer/lib/services/stream_service.dart`**
   - Uses `AppConstants.hlsManifestUrl` for manifest
   - Uses `AppConstants.broadcasterBaseUrl` for health checks
   - Removed localhost references

3. **Documentation Updates**
   - `BETA-QUICK-START.md` - Updated with production URLs
   - `BETA-ROADMAP.md` - Removed localhost configuration

### Production Endpoints

The Flutter app now connects to:

- **HLS Manifest**: `https://tv.danpage.uk/live/playlist.m3u8`
- **Signaling WebSocket**: `wss://tv.danpage.uk/ws`
- **Broadcaster API**: `https://tv.danpage.uk`
- **Health Check**: `https://tv.danpage.uk/health`
- **Chunk URLs**: `https://tv.danpage.uk/live/stream-*.ts`

### Architecture

```
Flutter App (Mobile/Android TV)
    ↓ HTTPS/WSS
Cloudflare Tunnel (tv.danpage.uk)
    ↓
EC2 Instance
    ├── Broadcaster Service (port 3000)
    ├── Signaling Server (port 8080)
    └── Owncast (HLS encoder)
```

### Next Steps

1. Implement the SimplePlayerScreen as shown in `BETA-QUICK-START.md`
2. Run the Flutter app on a device or emulator
3. The app will automatically connect to your production stream
4. Video should play from your live stream on EC2

### Testing

To verify the configuration:

```bash
# Check manifest is accessible
curl https://tv.danpage.uk/live/playlist.m3u8

# Check WebSocket endpoint
# Use a WebSocket client to connect to wss://tv.danpage.uk/ws

# Run Flutter app
cd flutter_viewer
flutter run
```

All localhost references have been replaced with production URLs. The app is ready to connect to your live stream!
