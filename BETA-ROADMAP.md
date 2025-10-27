# Beta Implementation Roadmap

## ✅ What's Already Implemented (Backend)

The backend services are **fully functional** and ready to use:

### 1. **Broadcaster Service** (`broadcaster/server.js`)
- ✅ Monitors Owncast HLS output directory
- ✅ Seeds chunks via WebTorrent P2P
- ✅ Uploads chunks to Cloudflare R2 (CDN fallback)
- ✅ Notifies signaling server of new chunks
- ✅ Serves HLS manifest at `/live/playlist.m3u8`
- ✅ Health check endpoint at `/health`

### 2. **Signaling Server** (`signaling/server.js`)
- ✅ WebSocket server on port 8080
- ✅ Broadcasts chunk announcements to all viewers
- ✅ Sends initial manifest on connect
- ✅ Handles viewer/broadcaster connections
- ✅ Stats endpoint

### 3. **PWA Viewer** (`viewer/`)
- ✅ P2P download with WebTorrent
- ✅ HTTP fallback to R2 CDN
- ✅ MediaSource Extensions playback
- ✅ Real-time stats monitoring

## 🔨 What's Been Added (Flutter Mobile)

### Core Services Implemented

1. **SignalingService** (`lib/services/signaling_service.dart`)
   - ✅ WebSocket connection to signaling server
   - ✅ Receives manifest on connect
   - ✅ Handles chunk announcements
   - ✅ Connection state management
   - ✅ Error handling

2. **StreamService** (`lib/services/stream_service.dart`)
   - ✅ Fetches HLS manifest from broadcaster
   - ✅ Health check endpoint
   - ✅ Simple implementation for beta

3. **P2PManager** (`lib/services/p2p_manager.dart`)
   - ✅ HTTP-based chunk downloading
   - ✅ Chunk caching
   - ✅ Callback system for downloaded chunks
   - ⚠️ **Note**: Uses HTTP fallback only (no WebTorrent yet)

### Configuration

- ✅ App constants with server URLs
- ✅ P2P and cache configuration
- ✅ Stream quality settings

## 🚧 What Needs to Be Done for Beta

### Priority 1: Get Video Playing

1. **Implement Player Screen** (`lib/screens/player_screen.dart`)
   - Connect SignalingService to receive chunks
   - Use P2PManager to download chunks
   - Feed chunks to video player (better_player)
   - Handle playback controls

2. **Connect All Services**
   - Initialize services in player screen
   - Start signaling connection
   - Subscribe to chunk callbacks
   - Download and play chunks sequentially

3. **Add Better Player Integration**
   - Configure better_player widget
   - Feed HLS manifest or chunk data
   - Handle buffering states
   - Display video controls

### Priority 2: Authentication Flow

Since the backend doesn't require authentication yet, you can:
- Skip login for now OR
- Add a simple "Enter Stream URL" input OR
- Connect directly to `localhost` for testing

### Priority 3: UI Polish

- Complete player screen UI
- Add loading states
- Add error handling
- Add stats overlay (if time permits)

## 🎯 Quick Start Approach

### Option 1: Simple HLS Player (Fastest)

Skip P2P for now and use better_player directly with HLS manifest:

```dart
// In player_screen.dart
BetterPlayer.network("http://localhost:3000/live/playlist.m3u8")
```

This gets video playing immediately, then you can add P2P later.

### Option 2: Full P2P Integration

1. Connect SignalingService
2. Receive chunks
3. Download via P2PManager
4. Feed to better_player (more complex)

## 📝 Next Steps

### Step 1: Test Backend is Running
```bash
# Check broadcaster
curl http://localhost:3000/health

# Check signaling (WebSocket)
# Use a WebSocket client or the viewer PWA
```

### Step 2: Implement Minimal Player Screen

See example structure below - implement this to get video playing.

### Step 3: Test with Real Stream

1. Start Owncast
2. Start broadcaster (`npm start` in broadcaster/)
3. Start signaling (`npm start` in signaling/)
4. Stream from OBS
5. Open Flutter app
6. Video should play!

## 🔧 Configuration

Your production setup is already running on EC2 with Cloudflare tunnel:

- **Broadcaster**: Running on EC2, serves HLS at `https://tv.danpage.uk/live/playlist.m3u8`
- **Signaling**: WebSocket server at `wss://tv.danpage.uk/ws`
- **CDN**: Cloudflare R2 for HTTP fallback chunks
- **Chunks**: Available at `https://tv.danpage.uk/live/stream-*.ts`

The Flutter app is now configured to connect to these production URLs.

## 📋 Testing Checklist

- [ ] Backend services running (broadcaster, signaling)
- [ ] Owncast receiving stream from OBS
- [ ] Broadcaster creating chunks and seeding
- [ ] Signaling server broadcasting chunks
- [ ] Flutter app connecting to signaling
- [ ] Chunks downloading in app
- [ ] Video playing in app
- [ ] No crashes or errors

## 🎨 Design Considerations

The app already has:
- Retro-cyberpunk theme
- VT323 and Courier Prime fonts
- Glitch animations
- Stats overlay widget

You just need to implement the actual video playback!

## 📚 Key Files to Focus On

1. `lib/screens/player_screen.dart` - Main video playback
2. `lib/services/signaling_service.dart` - Already implemented ✅
3. `lib/services/p2p_manager.dart` - Already implemented ✅
4. `lib/services/stream_service.dart` - Already implemented ✅

## 🚀 Deployment Strategy

For a beta, you have two paths:

### Path A: Local Testing
- Run everything on localhost
- Test with multiple devices on same WiFi
- Good for initial testing

### Path B: Deploy Backend to Cloud
- Deploy broadcaster + signaling to AWS EC2
- Use actual IP addresses
- Flutter app connects to public IP
- More realistic but requires deployment

## 💡 Architecture Summary

```
Flutter App
├── SignalingService → connects to ws://IP:8080
├── P2PManager → downloads chunks via HTTP (R2)
└── BetterPlayer → plays video chunks

Backend (Already Working!)
├── Broadcaster → monitors Owncast, seeds P2P, uploads R2
├── Signaling → broadcasts chunk announcements
└── Owncast → encodes HLS from OBS
```

The backend is production-ready. You just need to complete the Flutter player screen to consume the stream!
