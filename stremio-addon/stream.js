/**
 * Stremio Stream Handler
 * Returns torrent magnet URIs or HTTP URLs for playback
 */

function getStream(type, id, state, config) {
  // Only handle livestream IDs
  if (!id.startsWith('livestream:')) {
    return { streams: [] };
  }

  // If no chunks available, return empty
  if (state.playlist.getChunkCount() === 0) {
    return {
      streams: [
        {
          name: 'Stream Offline',
          title: 'Stream is currently offline',
          description: 'No stream available. Check back later.'
        }
      ]
    };
  }

  const streams = [];

  // Get latest chunk for P2P streaming
  const latestChunk = state.playlist.getLatestChunk();

  // Option 1: P2P via WebTorrent (if chunk has magnet URI)
  if (latestChunk && latestChunk.magnet) {
    streams.push({
      name: 'P2P - WebTorrent',
      title: `🌐 P2P Stream (Latest: ${latestChunk.filename})`,
      infoHash: latestChunk.infoHash,
      fileIdx: 0,
      sources: [
        'tracker:udp://tracker.opentrackr.org:1337',
        'tracker:udp://tracker.openbittorrent.com:6969',
        'tracker:wss://tracker.openwebtorrent.com',
        'tracker:wss://tracker.btorrent.xyz',
        'tracker:wss://tracker.fastcast.nz'
      ],
      behaviorHints: {
        bingeGroup: 'livestream-current',
        notWebReady: false
      }
    });
  }

  // Option 2: HTTP Stream via R2/CDN
  if (latestChunk && latestChunk.r2) {
    streams.push({
      name: 'HTTP - CDN',
      title: '☁️ HTTP Stream (Cloudflare R2)',
      url: latestChunk.r2,
      behaviorHints: {
        bingeGroup: 'livestream-current'
      }
    });
  }

  // Option 3: HTTP Stream via Broadcaster
  if (latestChunk && latestChunk.http) {
    streams.push({
      name: 'HTTP - Direct',
      title: '📡 HTTP Stream (Direct)',
      url: latestChunk.http,
      behaviorHints: {
        bingeGroup: 'livestream-current'
      }
    });
  }

  // Option 4: HLS Playlist (if available)
  // This would be a generated M3U8 playlist of recent chunks
  const hlsUrl = buildHLSPlaylist(state, config);
  if (hlsUrl) {
    streams.push({
      name: 'HLS Playlist',
      title: '📺 HLS Stream (Adaptive)',
      url: hlsUrl,
      behaviorHints: {
        bingeGroup: 'livestream-current'
      }
    });
  }

  // If no streams available, provide helpful message
  if (streams.length === 0) {
    return {
      streams: [
        {
          name: 'No Stream Available',
          title: 'Stream is loading...',
          description: 'Please wait for the stream to become available.'
        }
      ]
    };
  }

  return { streams };
}

/**
 * Build HLS playlist URL from recent chunks
 * This would generate an M3U8 playlist dynamically
 */
function buildHLSPlaylist(state, config) {
  // For now, return null
  // TODO: Implement dynamic HLS playlist generation
  // Would return something like: `${config.cdnBaseUrl}/playlist/current.m3u8`
  return null;
}

module.exports = { getStream };

