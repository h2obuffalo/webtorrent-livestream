# WebTorrent Live Streaming - Stremio Addon Architecture

## New Architecture with Stremio Support

```
OBS Studio → Owncast (RTMP → HLS encoding)
    ↓
Broadcaster Service (Node.js)
    ├── Monitor Owncast HLS output
    ├── Create torrents from chunks
    ├── Upload to R2 (HTTP fallback)
    └── Update Stremio manifest
          ↓
    Stremio Addon Server (Express API)
          ↓
    Stremio App (on any device)
        ├── Fire TV ✅
        ├── Apple TV ✅
        ├── iOS ✅
        ├── Android TV ✅
        ├── Android Mobile ✅ (+ Chromecast)
        ├── Desktop ✅ (+ Chromecast)
        └── Plays torrent stream natively
```

---

## Why Stremio?

### ✅ Universal Platform Support

Stremio has **native apps** for:
- **Fire TV** - Full app, works perfectly
- **Apple TV** - Native tvOS app
- **iOS** - Native iOS app
- **Android TV** - Native Android TV app
- **Android Mobile** - Native app with Chromecast
- **Desktop** - Windows, macOS, Linux

### ✅ Built-in Torrent Support

- Native torrent engine
- Handles magnet URIs automatically
- Manages peers, buffering, playback
- HTTP fallback built-in

### ✅ Chromecast Integration

- Cast from phone/desktop to TV
- Works on all non-TV platforms
- Seamless casting experience

### ✅ Familiar UX

- Users already know Stremio
- No need to build custom apps
- Professional UI out of the box

---

## How Stremio Addons Work

### Addon Structure

A Stremio addon is a simple HTTP server that provides:

1. **Manifest** - Describes what content the addon provides
2. **Catalog** - Lists available content (streams/movies/series)
3. **Stream** - Provides torrent/HTTP URLs for playback

### Addon API Endpoints

```
GET /manifest.json
→ Returns addon metadata

GET /catalog/{type}/{id}.json
→ Returns list of available streams

GET /stream/{type}/{id}.json
→ Returns torrent magnet URI or HTTP URL
```

### Our Implementation

```
GET /manifest.json
→ Live stream addon info

GET /catalog/tv/live-streams.json
→ List of active live streams

GET /stream/tv/live-stream-{timestamp}.json
→ Latest chunk magnet URIs + HTTP fallback
```

---

## Architecture Components

### 1. Broadcaster (Existing)
- Monitors Owncast HLS output
- Creates torrents from chunks
- Seeds via WebTorrent
- Uploads to R2

**New addition**: Notifies Stremio addon of new chunks

### 2. Stremio Addon Server (New)
- Express.js HTTP server
- Serves Stremio manifest
- Provides catalog of live streams
- Returns chunk magnet URIs
- Maintains playlist of latest chunks

### 3. Signaling Server (Simplified)
- Notifies addon server of new chunks
- No longer needs to coordinate with web viewers
- Simpler WebSocket protocol

### 4. Clients
- **Stremio apps** on all platforms
- No custom PWA needed
- Users install addon once, works everywhere

---

## Stremio Addon Implementation

### Manifest

```json
{
  "id": "org.webtorrent.livestream",
  "version": "1.0.0",
  "name": "WebTorrent Live Stream",
  "description": "P2P live streaming with HTTP fallback",
  "logo": "https://your-cdn.com/logo.png",
  "background": "https://your-cdn.com/background.jpg",
  
  "resources": [
    "catalog",
    "stream"
  ],
  
  "types": ["tv"],
  
  "catalogs": [
    {
      "type": "tv",
      "id": "live-streams",
      "name": "Live Streams",
      "extra": [
        { "name": "genre", "isRequired": false }
      ]
    }
  ],
  
  "idPrefixes": ["livestream:"],
  
  "behaviorHints": {
    "adult": false,
    "p2p": true,
    "configurable": true
  }
}
```

### Catalog Response

```json
{
  "metas": [
    {
      "id": "livestream:current",
      "type": "tv",
      "name": "Live Event Stream",
      "poster": "https://your-cdn.com/poster.jpg",
      "background": "https://your-cdn.com/background.jpg",
      "description": "Live event streaming via P2P",
      "releaseInfo": "2025",
      "genres": ["Live"],
      "runtime": "120 min",
      "links": []
    }
  ]
}
```

### Stream Response (Key Part!)

```json
{
  "streams": [
    {
      "name": "P2P - Latest Chunks",
      "title": "WebTorrent P2P (HD)",
      "infoHash": "abc123...",
      "fileIdx": 0,
      "sources": [
        "tracker:udp://tracker.opentracker.org:1337",
        "tracker:wss://tracker.openwebtorrent.com"
      ],
      "behaviorHints": {
        "bingeGroup": "livestream-current",
        "notWebReady": false
      }
    },
    {
      "name": "HTTP Fallback",
      "title": "HTTP Stream (HD)",
      "url": "https://your-cdn.com/live/playlist.m3u8",
      "behaviorHints": {
        "bingeGroup": "livestream-current"
      }
    }
  ]
}
```

---

## Live Streaming Approach with Stremio

Stremio is designed for on-demand content, but we can adapt it for live streaming:

### Option 1: Rolling Playlist (Recommended)

Package recent chunks as a "virtual file":

```javascript
// Create multi-file torrent with last 10 chunks
const torrent = {
  name: 'live-stream',
  files: [
    'chunk-001.ts',
    'chunk-002.ts',
    'chunk-003.ts',
    // ... last 10 chunks
  ]
}

// Update torrent every new chunk
// Stremio fetches latest via stream endpoint
```

### Option 2: HLS Playlist via HTTP

Use HTTP fallback as primary:

```json
{
  "streams": [
    {
      "name": "Live Stream",
      "title": "HTTP Live Stream",
      "url": "https://your-r2-cdn.com/live/playlist.m3u8"
    }
  ]
}
```

Simpler but no P2P benefit.

### Option 3: Update Stream Endpoint Frequently

Stremio can poll the stream endpoint:

```javascript
// Addon returns different infoHash each minute
GET /stream/tv/livestream:current.json
→ Returns latest chunk bundle torrent

// Broadcaster creates new torrent every 30-60 seconds
// Contains last 5 minutes of chunks
```

---

## Implementation Plan

### Phase 1: Basic Stremio Addon ✅

Create addon server that:
- Serves manifest
- Provides catalog with live stream
- Returns HLS URL (HTTP fallback only)

**Test**: Install addon in Stremio, verify stream plays

### Phase 2: Add Torrent Support 🚀

- Create multi-file torrents from chunks
- Seed torrents with broadcaster
- Return infoHash in stream response
- Test P2P playback in Stremio

### Phase 3: Dynamic Updates 🔄

- Update stream manifest every 30-60 seconds
- Create rolling window of recent chunks
- Implement automatic playlist updates
- Handle viewer seeking to live edge

### Phase 4: Production Deploy 🌐

- Deploy addon to public URL
- Make addon installable via URL
- Add configuration options
- Monitor usage and performance

---

## Directory Structure

```
webtorrent-livestream/
├── broadcaster/          # Existing - creates torrents
├── signaling/           # Simplified - notifies addon
├── stremio-addon/       # NEW - Stremio addon server
│   ├── server.js        # Express server
│   ├── manifest.js      # Addon manifest
│   ├── catalog.js       # Catalog handler
│   ├── stream.js        # Stream handler
│   ├── playlist.js      # Chunk playlist manager
│   └── package.json
├── viewer/              # Keep for web-based testing
│   └── test-standalone.html
└── docs/
    ├── STREMIO-SETUP.md
    └── STREMIO-USAGE.md
```

---

## Advantages of Stremio Approach

### ✅ Universal Compatibility
- Works on ALL target platforms
- No need to build separate apps
- Users already have Stremio installed

### ✅ P2P Built-in
- Stremio handles torrent playback natively
- Better optimized than web-based WebTorrent
- Desktop app has full P2P capabilities

### ✅ Chromecast Integration
- Built into mobile/desktop apps
- No custom casting code needed
- Professional casting experience

### ✅ HTTP Fallback Automatic
- Stremio tries torrent first
- Falls back to HTTP if torrent fails
- Seamless for users

### ✅ Familiar UX
- Users know how to use Stremio
- Professional interface
- No training needed

### ✅ Simple Distribution
- Share addon URL
- Users install with one click
- Automatic updates

---

## Disadvantages to Consider

### ⚠️ Requires Stremio Install
- Users must have Stremio app
- Not browser-based (but apps available everywhere)
- Small learning curve for non-Stremio users

### ⚠️ Live Streaming Workarounds
- Stremio designed for on-demand
- Need to update stream endpoint frequently
- May have latency issues with playlist updates

### ⚠️ Less Control
- Can't customize UI (Stremio's UI)
- Limited to Stremio's capabilities
- Dependent on Stremio platform

### ⚠️ Seeking/DVR Complex
- Live streaming DVR functionality limited
- Harder to implement "jump to live" feature
- Playlist management more complex

---

## Hybrid Approach (Best of Both?)

### Use Both Systems:

1. **Stremio Addon** for:
   - Fire TV (native app)
   - Apple TV (native app)
   - iOS (native app)
   - Desktop power users (better P2P)

2. **Web PWA** for:
   - Quick access (no install)
   - Embedded on website
   - Testing and development
   - Users without Stremio

### Benefits:
- Maximum compatibility
- Best experience on each platform
- Fallback options for users

---

## Next Steps

### Immediate:
1. **Test Stremio on your devices**:
   - Install Stremio on Fire TV
   - Test with existing addon
   - Verify Chromecast works

2. **Prototype basic addon**:
   - Create simple Express server
   - Serve manifest
   - Return HLS URL
   - Test in Stremio

### Short-term:
1. Build full Stremio addon
2. Integrate with broadcaster
3. Test live streaming workflow
4. Deploy and share addon URL

### Long-term:
1. Optimize P2P performance
2. Add DVR/seeking features
3. Create web PWA as alternative
4. Production deployment

---

## Should We Pivot to Stremio?

### Vote: YES if:
- ✅ Target audience includes Fire TV/iOS/Apple TV
- ✅ Users willing to install Stremio app
- ✅ Want native app experience
- ✅ Chromecast support is important
- ✅ Want simpler development (no custom apps)

### Vote: KEEP WEB if:
- ✅ Need browser-based (no install)
- ✅ Want full UI customization
- ✅ Embedded on website required
- ✅ Target is desktop/Android Chrome only

### Vote: BOTH if:
- ✅ Want maximum flexibility
- ✅ Can maintain two distribution methods
- ✅ Different audiences prefer different methods

---

## My Recommendation

**Build the Stremio addon first**, because:

1. **Fastest path to Fire TV/iOS/Apple TV** ✅
2. **Leverages existing infrastructure** (broadcaster, torrents)
3. **Can test viability quickly** (addon in 1-2 hours)
4. **Keep web PWA as backup** (already built)
5. **Users can choose** (Stremio or web)

Start with Phase 1 (HTTP-only addon) to test the UX, then add P2P in Phase 2 if it feels right.

Want me to build the Stremio addon server now? 🚀

---

## Prior Art & References

### live-torrent Project

Our implementation draws inspiration from [live-torrent](https://github.com/pldubouilh/live-torrent), a proven POC for WebTorrent-based live streaming with HTTP fallback. See [`docs/PRIOR-ART.md`](docs/PRIOR-ART.md) for detailed analysis.

**Key Insight**: live-torrent uses a **Service Worker pattern** to intercept video chunk requests, try P2P first, and automatically fall back to HTTP when P2P fails or times out. This approach has been proven in production at [live.computer](https://live.computer).

**Differences in Our Approach**:
- We use `p2p-media-loader-hlsjs` library instead of custom Service Worker
- Lower complexity but less control over fallback behavior
- Direct WebRTC integration vs Service Worker proxy

**Lesson Learned**: HTTP fallback is **achievable and proven** in P2P live streaming. If p2p-media-loader continues to have issues, the Service Worker approach is a viable alternative with full control over request/response handling.

For comprehensive comparison, applicable techniques, and implementation details, see [`docs/PRIOR-ART.md`](docs/PRIOR-ART.md).

---

