/**
 * Shared message types for WebSocket communication
 * between broadcaster, signaling server, and viewers
 */

// Message Types
const MessageTypes = {
  // Signaling → Viewer
  MANIFEST: 'manifest',        // Initial chunk manifest on connect
  CHUNK: 'chunk',              // New chunk available
  STATS: 'stats',              // Server statistics
  PONG: 'pong',                // Ping response
  SERVER_SHUTDOWN: 'server_shutdown',
  
  // Viewer → Signaling
  PING: 'ping',                // Keep-alive ping
  STATS_REQUEST: 'stats',      // Request server stats
  
  // Broadcaster → Signaling
  CHUNK_ANNOUNCEMENT: 'chunk',  // New chunk ready
};

// Chunk Info Structure
const ChunkInfo = {
  seq: 0,                      // Sequence number
  filename: '',                // Filename (e.g., stream0001.ts)
  magnet: '',                  // Magnet URI for P2P
  http: '',                    // HTTP URL (broadcaster)
  r2: '',                      // R2 CDN URL (fallback)
  timestamp: 0,                // Unix timestamp (ms)
  size: 0,                     // File size in bytes
  infoHash: '',                // BitTorrent info hash
};

// Manifest Message Structure
const ManifestMessage = {
  type: 'manifest',
  chunks: [],                  // Array of ChunkInfo objects
  stats: {
    totalChunks: 0,
    activeViewers: 0,
    serverUptime: 0,
  },
};

// Stats Message Structure
const StatsMessage = {
  type: 'stats',
  totalChunks: 0,
  manifestChunks: 0,
  activeViewers: 0,
  activeBroadcasters: 0,
  serverUptime: 0,
};

// Validation helpers
function isValidChunkInfo(chunk) {
  return (
    typeof chunk.seq === 'number' &&
    typeof chunk.filename === 'string' &&
    typeof chunk.magnet === 'string' &&
    (typeof chunk.http === 'string' || chunk.http === undefined) &&
    (typeof chunk.r2 === 'string' || chunk.r2 === undefined) &&
    typeof chunk.timestamp === 'number' &&
    typeof chunk.size === 'number'
  );
}

function isValidManifest(manifest) {
  return (
    manifest.type === 'manifest' &&
    Array.isArray(manifest.chunks) &&
    manifest.chunks.every(isValidChunkInfo)
  );
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MessageTypes,
    ChunkInfo,
    ManifestMessage,
    StatsMessage,
    isValidChunkInfo,
    isValidManifest,
  };
}

