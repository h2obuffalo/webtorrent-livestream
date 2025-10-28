# Quick Start Guide - Get Video Playing ASAP

## Overview

The backend is fully working. You just need to connect the Flutter app to play video.

## Simplest Approach: Direct HLS Playback

Since the broadcaster already serves an HLS manifest at `http://localhost:3000/live/playlist.m3u8`, the simplest way to get video playing is to use that URL directly.

### Step 1: Simplify Player Screen

Replace the complex player screen with a simple one that just uses better_player with the HLS manifest:

```dart
import 'package:flutter/material.dart';
import 'package:better_player/better_player.dart';
import '../config/constants.dart';

class SimplePlayerScreen extends StatefulWidget {
  const SimplePlayerScreen({super.key});

  @override
  State<SimplePlayerScreen> createState() => _SimplePlayerScreenState();
}

class _SimplePlayerScreenState extends State<SimplePlayerScreen> {
  late BetterPlayerController _controller;
  
  @override
  void initState() {
    super.initState();
    _initPlayer();
  }
  
  void _initPlayer() {
    // Get the broadcaster's HLS manifest via Cloudflare tunnel
    final manifestUrl = "https://tv.danpage.uk/live/playlist.m3u8";
    
    final dataSource = BetterPlayerDataSource(
      BetterPlayerDataSourceType.network,
      manifestUrl,
      videoFormat: BetterPlayerVideoFormat.other,
      liveStream: true,
    );
    
    final config = BetterPlayerConfiguration(
      aspectRatio: 16 / 9,
      autoPlay: true,
      looping: false,
      controlsConfiguration: const BetterPlayerControlsConfiguration(
        enableProgressIndicator: true,
        enableMute: true,
        enableFullscreen: true,
      ),
    );
    
    _controller = BetterPlayerController(config);
    _controller.setupDataSource(dataSource);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: BetterPlayer(controller: _controller),
    );
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Step 2: Update Main Menu to Navigate to Player

In `main_menu_screen.dart`, add a button to go to the player:

```dart
ElevatedButton(
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const SimplePlayerScreen(),
      ),
    );
  },
  child: const Text('Watch Stream'),
)
```

### Step 3: Start Everything

```bash
# Terminal 1: Start Owncast
cd owncast
./owncast

# Terminal 2: Start Broadcaster
cd broadcaster
npm start

# Terminal 3: Start Signaling
cd signaling
npm start

# Terminal 4: Stream from OBS
# Connect OBS to rtmp://localhost:1935

# Terminal 5: Run Flutter App
cd flutter_viewer
flutter run
```

### Step 4: Test

1. Open the app
2. Click "Watch Stream"
3. Video should start playing!

## Production URLs

The app is already configured to use production URLs:
- HLS Manifest: `https://tv.danpage.uk/live/playlist.m3u8`
- Signaling WebSocket: `wss://tv.danpage.uk/ws`
- Broadcaster Base: `https://tv.danpage.uk`

All traffic goes through the Cloudflare tunnel to your EC2 instance.

## Adding P2P Later

Once you get basic video playback working, you can add:

1. Connect to signaling server to get chunk info
2. Download chunks via P2P (using your P2PManager)
3. Feed chunks to player

But for the beta, HLS playback is the fastest way to get it working!

## Troubleshooting

### Video Won't Play

1. Check if stream is live: `curl https://tv.danpage.uk/live/playlist.m3u8`
2. Verify broadcaster is running on EC2 (check PM2: `pm2 status`)
3. Check Cloudflare tunnel is active
4. Verify chunks are being created (check EC2 logs)

### Connection Refused

- Check EC2 security groups allow traffic on port 8080 (WebSocket)
- Verify Cloudflare tunnel configuration
- Check if broadcaster and signaling services are running: `pm2 status`

### Buffering Issues

- Check network connection
- Lower bitrate in Owncast settings
- Check CPU/memory usage on server

## Next Steps After Basic Playback Works

1. Add stats overlay showing chunk count, peers, etc.
2. Implement full P2P integration
3. Add Chromecast support
4. Polish UI with retro theme

But first, just get video playing! 🎥
