# Prior Art & References

This document catalogs relevant prior work, research, and projects that inform our WebTorrent live streaming implementation.

---

## live-torrent

**Repository**: [https://github.com/pldubouilh/live-torrent](https://github.com/pldubouilh/live-torrent)

**Status**: Proof-of-concept (POC) - may use outdated libraries but demonstrates proven techniques

**Live Demo**: [https://live.computer](https://live.computer)

### Overview

A simple proof-of-concept for live streaming using WebTorrent. This project successfully demonstrates P2P-accelerated HLS streaming with automatic HTTP fallback in a production environment.

### Architecture

The live-torrent project uses a **3-component architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Server Script (Node.js)                                  │
│    - Parses HLS video manifest                              │
│    - Generates torrent magnet links from video chunks       │
│    - Embeds magnet URIs directly into manifest              │
│    - Serves modified manifest to clients                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Service Worker (Browser)                                 │
│    - Intercepts all manifest/chunk HTTP requests            │
│    - Extracts magnet links from manifest                    │
│    - Proxies video chunk requests to WebTorrent             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Client Script (Browser + WebTorrent)                     │
│    - Receives chunk requests from Service Worker            │
│    - Attempts P2P download via WebTorrent first             │
│    - **Falls back to HTTP if P2P fails/times out**          │
│    - Seeds chunks after HTTP download                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    HLS.js Video Player
```

### Key Technique: HTTP Fallback via Service Worker

The most important lesson from live-torrent is their **HTTP fallback strategy**:

1. Service Worker intercepts all video chunk requests from HLS.js
2. Tries to download chunk via WebTorrent P2P (with timeout)
3. If P2P fails (no peers, timeout, error):
   - Falls back to original HTTP URL
   - Downloads chunk via HTTP
   - **Seeds the HTTP-downloaded chunk** for other peers
4. Returns chunk to video player (transparent to HLS.js)

**Why this works**: The Service Worker has full control over the request/response cycle, allowing custom retry logic and fallback behavior that p2p-media-loader libraries sometimes struggle with.

### Comparison with Our Approach

| Aspect | live-torrent | Our Implementation |
|--------|--------------|-------------------|
| **P2P Library** | Custom Service Worker + WebTorrent | p2p-media-loader-hlsjs |
| **HTTP Fallback** | Custom logic in SW | Library-dependent (v0.6.2 buggy, v2.2.1 better) |
| **Magnet URIs** | Embedded in HLS manifest | Generated from segments dynamically |
| **Video Player** | HLS.js (oblivious to P2P) | HLS.js with P2P loader integration |
| **Control Level** | Full control, custom code | Library abstraction, less control |
| **Complexity** | Higher (3 components) | Lower (library handles most logic) |
| **Browser Compatibility** | Requires Service Worker support | Direct WebRTC, broader support |

### Lessons Learned

#### ✅ What Works Well

1. **P2P-first, HTTP-fallback pattern is proven** in production
2. **Service Workers provide full request control** for reliable fallback
3. **Automatic seeding after HTTP download** maximizes P2P efficiency
4. **Transparent to video player** - HLS.js doesn't need P2P awareness
5. **Works with any HLS stream** - can wrap existing feeds

#### ⚠️ Considerations

1. **HTTPS Required**: Service Workers only work on HTTPS (or localhost)
2. **Service Worker Scope**: Must be served from domain root (e.g., `/sw.js`)
3. **CORS Required**: HLS manifest/chunks must have proper CORS headers
4. **Browser Support**: Limited to browsers supporting Service Workers
5. **Complexity**: Three separate codebases to maintain (server, SW, client)

### Applicable Techniques for Our Project

1. **Fallback Strategy**: Even if using p2p-media-loader, we should:
   - Set reasonable P2P timeouts
   - Ensure HTTP fallback is always available
   - Monitor fallback rates in production

2. **Seeding Downloaded Content**: After HTTP fallback, immediately seed chunks to help other peers

3. **Manifest Modification**: Consider embedding magnet URIs in manifest for more control

4. **Service Worker Alternative**: If p2p-media-loader continues to have issues, the Service Worker approach is a proven fallback strategy

### When to Consider Service Worker Approach

Consider implementing a custom Service Worker solution if:

- p2p-media-loader library continues to have HTTP fallback issues
- Need more control over P2P/HTTP decision logic
- Want to support legacy HLS players without P2P awareness
- Need custom retry/timeout strategies
- Have resources to maintain custom P2P integration

### Technical Requirements from live-torrent

Based on their implementation:

```javascript
// Server: Embed magnet URIs in manifest
#EXTINF:10.0,
#EXT-X-MAGNET:magnet:?xt=urn:btih:...
chunk-001.ts

// Service Worker: Intercept and route
self.addEventListener('fetch', (event) => {
  if (isVideoChunk(event.request.url)) {
    event.respondWith(handleVideoChunk(event.request));
  }
});

// Client: Try P2P, fallback to HTTP
async function handleVideoChunk(request) {
  try {
    // Try P2P with timeout
    return await downloadViaTorrent(magnetUri, { timeout: 5000 });
  } catch (err) {
    // Fallback to HTTP
    const response = await fetch(request);
    seedToTorrent(response.clone()); // Seed for others
    return response;
  }
}
```

---

## p2p-media-loader

**Repository**: [https://github.com/Novage/p2p-media-loader](https://github.com/Novage/p2p-media-loader)

**Current Usage**: Primary library in our implementation

### Version History & Issues

- **v0.6.2** (older, stable): Buggy HTTP fallback, fragments fail when no peers available
- **v2.2.1** (newer, current): Improved API with `initHlsJsPlayer()` mixin, better HTTP fallback

### Key Difference from live-torrent

p2p-media-loader integrates directly with HLS.js via custom loaders, whereas live-torrent uses Service Workers. Both approaches are valid with different tradeoffs.

---

## Future Research Areas

1. **WebTorrent Native Seeding**: Investigate using `webtorrent-hybrid` on server to seed HLS chunks
2. **Hybrid CDN + P2P**: Combine Cloudflare R2 CDN with P2P for optimal delivery
3. **Adaptive Streaming**: Adjust P2P/HTTP ratio based on peer availability
4. **Mobile Optimization**: Battery and bandwidth considerations for P2P on mobile devices
5. **Low-Latency HLS**: LL-HLS compatibility with WebTorrent P2P

---

## References

- [live-torrent GitHub](https://github.com/pldubouilh/live-torrent)
- [live-torrent Demo](https://live.computer)
- [p2p-media-loader GitHub](https://github.com/Novage/p2p-media-loader)
- [WebTorrent Protocol](https://github.com/webtorrent/webtorrent)
- [HLS.js Documentation](https://github.com/video-dev/hls.js)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Last Updated**: 2025-10-23

