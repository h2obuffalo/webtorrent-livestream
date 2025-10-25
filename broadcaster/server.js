require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const WebTorrent = require('webtorrent');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { uploadToR2, verifyR2Connection } = require('./r2-uploader');
const ManifestGenerator = require('./manifest-generator');

// Configuration
const config = {
  owncastPath: process.env.OWNCAST_DATA_PATH || '../owncast/data/hls/0',
  httpPort: parseInt(process.env.HTTP_PORT) || 3000,
  signalingUrl: process.env.SIGNALING_URL || 'ws://localhost:8080',
  trackers: (process.env.TRACKER_URLS || 'wss://tracker.openwebtorrent.com').split(','),
  retentionMinutes: parseInt(process.env.CHUNK_RETENTION_MINUTES) || 5,
  r2Path: process.env.R2_UPLOAD_PATH || 'live/',
  enableDebug: process.env.ENABLE_DEBUG_LOGGING === 'true',
};

// State management
const state = {
  activeTorrents: new Map(), // filename -> torrent object
  processedChunks: new Set(), // Track already processed chunks
  chunkSequence: 0,
  signalingWs: null,
  signalingReconnectTimer: null,
  lastChunkTime: null, // Track when we last received a chunk
  streamRestartTimer: null, // Timer to detect stream restarts
  streamSessionId: Date.now(), // Unique ID for each stream session
  streamStopped: false, // Flag: stream has stopped (no chunks for 30s)
};

// Initialize manifest generator (uses R2 URLs for HTTP fallback)
const manifestGenerator = new ManifestGenerator({
  maxChunks: 60, // Keep last 60 chunks in playlist (5 minutes @ 5s/chunk)
  targetDuration: 6, // Estimated chunk duration in seconds
});

// Function to clear stream state (called on stream restart detection)
function clearStreamState() {
  console.log('\n🔄 Stream restart detected - clearing state...');
  
  // Clear manifest
  const oldChunkCount = manifestGenerator.getChunkCount();
  manifestGenerator.clear();
  console.log(`   📋 Cleared ${oldChunkCount} chunks from manifest`);
  
  // Destroy all active torrents
  const oldTorrentCount = state.activeTorrents.size;
  state.activeTorrents.forEach((torrent, filename) => {
    torrent.destroy();
  });
  state.activeTorrents.clear();
  console.log(`   🛑 Destroyed ${oldTorrentCount} active torrents`);
  
  // Clear processed chunks
  state.processedChunks.clear();
  console.log(`   🗑️  Cleared processed chunks set`);
  
  // Reset sequence
  state.chunkSequence = 0;
  console.log(`   🔢 Reset chunk sequence to 0`);
  
  // Reset stream stopped flag
  state.streamStopped = false;
  
  // Generate new stream session ID
  const oldSessionId = state.streamSessionId;
  state.streamSessionId = Date.now();
  console.log(`   🆔 New stream session: ${oldSessionId} → ${state.streamSessionId}`);
  
  console.log('✅ Stream state cleared - ready for new stream\n');
}

// Monitor for stream restarts (no chunks for 15 seconds = stream stopped)
function resetStreamRestartTimer() {
  if (state.streamRestartTimer) {
    clearTimeout(state.streamRestartTimer);
  }
  
  state.streamRestartTimer = setTimeout(() => {
    // No chunks received for 15 seconds - mark stream as stopped
    if (state.lastChunkTime && (Date.now() - state.lastChunkTime > 15000)) {
      console.log('\n⏸️  Stream stopped (15s timeout) - will clear on next chunk');
      state.streamStopped = true;
      // Don't clear state yet - wait for next chunk to arrive
    }
  }, 15000);
}

// Initialize WebTorrent client
const wtClient = new WebTorrent({
  maxConns: 200, // Support many concurrent connections for 400-1000 viewers
  dht: true,
  lsd: true,
  tracker: true,
});

console.log('🚀 WebTorrent Broadcaster Service Starting...\n');

// Verify R2 connection on startup
verifyR2Connection()
  .then(() => console.log('✅ Cloudflare R2 connection verified\n'))
  .catch(err => console.error('❌ R2 connection failed:', err.message, '\n'));

// Setup HTTP server for chunk serving
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
}));

// Serve chunks directory
const chunksDir = path.resolve(config.owncastPath);
if (!fs.existsSync(chunksDir)) {
  console.warn(`⚠️  Warning: Owncast directory not found: ${chunksDir}`);
  console.log('   Make sure Owncast is installed and configured correctly.\n');
}

app.use('/chunks', express.static(chunksDir, {
  setHeaders: (res) => {
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=300');
  },
}));

// Manifest endpoint - serves HLS playlist with R2 URLs
app.get('/live/playlist.m3u8', (req, res) => {
  const manifest = manifestGenerator.generateManifest();
  const stats = manifestGenerator.getStats();
  
  res.set({
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
  });
  
  if (config.enableDebug) {
    console.log(`📋 Manifest requested - ${stats.chunkCount} chunks available`);
  }
  
  res.send(manifest);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const manifestStats = manifestGenerator.getStats();
  res.json({
    status: 'ok',
    torrents: state.activeTorrents.size,
    peers: Array.from(state.activeTorrents.values()).reduce((sum, t) => sum + t.numPeers, 0),
    chunks: state.chunkSequence,
    manifestChunks: manifestStats.chunkCount,
    signaling: state.signalingWs?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const torrents = Array.from(state.activeTorrents.values()).map(t => ({
    name: t.name,
    infoHash: t.infoHash,
    peers: t.numPeers,
    uploaded: t.uploaded,
    downloaded: t.downloaded,
    ratio: t.ratio,
  }));

  res.json({
    torrents,
    totalPeers: torrents.reduce((sum, t) => sum + t.peers, 0),
    totalUploaded: torrents.reduce((sum, t) => sum + t.uploaded, 0),
  });
});

const server = app.listen(config.httpPort, () => {
  console.log(`✅ HTTP server listening on port ${config.httpPort}`);
  console.log(`   Serving chunks from: ${chunksDir}\n`);
});

// Connect to signaling server
function connectSignaling() {
  if (state.signalingReconnectTimer) {
    clearTimeout(state.signalingReconnectTimer);
  }

  try {
    state.signalingWs = new WebSocket(config.signalingUrl);

    state.signalingWs.on('open', () => {
      console.log('✅ Connected to signaling server:', config.signalingUrl);
    });

    state.signalingWs.on('error', (err) => {
      console.error('❌ Signaling WebSocket error:', err.message);
    });

    state.signalingWs.on('close', () => {
      console.log('⚠️  Signaling connection closed. Reconnecting in 5s...');
      state.signalingReconnectTimer = setTimeout(connectSignaling, 5000);
    });

  } catch (err) {
    console.error('❌ Failed to connect to signaling server:', err.message);
    state.signalingReconnectTimer = setTimeout(connectSignaling, 5000);
  }
}

// Send chunk info to signaling server
function notifySignaling(chunkInfo) {
  if (state.signalingWs?.readyState === WebSocket.OPEN) {
    try {
      state.signalingWs.send(JSON.stringify({
        type: 'chunk',
        ...chunkInfo,
      }));
      if (config.enableDebug) {
        console.log('   → Sent to signaling server');
      }
    } catch (err) {
      console.error('❌ Failed to send to signaling:', err.message);
    }
  } else {
    console.warn('⚠️  Signaling not connected, cannot notify');
  }
}

// Process new chunk file
async function processChunk(filePath) {
  const filename = path.basename(filePath);
  
  // Only process .ts files
  if (!filename.endsWith('.ts')) {
    return;
  }

  // Skip if already processed
  if (state.processedChunks.has(filename)) {
    return;
  }

  // Wait a moment for file to be fully written
  await new Promise(resolve => setTimeout(resolve, 500));

  // Verify file exists and has content
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File disappeared: ${filename}`);
    return;
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.warn(`⚠️  File is empty: ${filename}`);
    return;
  }

  // If stream was stopped and new chunk arrives = restart detected!
  if (state.streamStopped) {
    console.log(`\n🔄 New chunk after stream stop - stream restarting!`);
    clearStreamState();
  }
  
  state.processedChunks.add(filename);
  state.chunkSequence++;
  
  // Update last chunk time and reset restart detection timer
  state.lastChunkTime = Date.now();
  resetStreamRestartTimer();

  console.log(`\n📦 New chunk detected: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

  const seq = state.chunkSequence;
  const timestamp = state.lastChunkTime;

  // 1. Upload to R2 FIRST (so we have the URL for signaling and manifest)
  console.log('   ☁️  Uploading to Cloudflare R2...');
  
  // Include stream session ID in R2 path to prevent conflicts between streams
  const r2Key = `${config.r2Path}${state.streamSessionId}/${filename}`;
  const r2Url = await uploadToR2(filePath, r2Key);
  
  if (r2Url) {
    console.log(`   ✅ R2 upload complete: ${r2Url}`);
    
    // Add to manifest generator (uses R2 URL for HTTP fallback)
    const chunkInfo = {
      filename,
      r2: r2Url,
      size: stats.size,
      timestamp,
      seq,
    };
    manifestGenerator.addChunk(chunkInfo);
    console.log(`   📋 Added to manifest (${manifestGenerator.getChunkCount()} chunks total)`);
  } else {
    console.error(`   ❌ R2 upload failed for ${filename}`);
  }

  // 2. Seed with WebTorrent
  console.log('   🌱 Seeding via WebTorrent...');
  
  wtClient.seed(filePath, { 
    announce: config.trackers,
    name: filename,
  }, (torrent) => {
    console.log(`   ✅ Seeding: ${torrent.infoHash.substring(0, 20)}...`);
    console.log(`   📡 Magnet: ${torrent.magnetURI.substring(0, 80)}...`);
    
    // Store torrent reference
    state.activeTorrents.set(filename, torrent);

    // 3. Notify signaling server NOW (we have both torrent AND r2Url)
    const chunkInfo = {
      seq,
      filename,
      magnet: torrent.magnetURI,
      http: `http://localhost:${config.httpPort}/chunks/${filename}`,
      r2: r2Url,
      timestamp,
      size: stats.size,
      infoHash: torrent.infoHash,
    };
    
    notifySignaling(chunkInfo);

    // Monitor peers
    torrent.on('wire', (wire) => {
      console.log(`   👥 New peer connected to ${filename} (total: ${torrent.numPeers})`);
    });

    // Monitor upload
    let lastUpload = 0;
    setInterval(() => {
      if (torrent.uploaded > lastUpload) {
        const uploaded = ((torrent.uploaded - lastUpload) / 1024).toFixed(2);
        console.log(`   ⬆️  Uploaded ${uploaded} KB via P2P to ${torrent.numPeers} peers`);
        lastUpload = torrent.uploaded;
      }
    }, 10000);
  });

  // 4. Schedule cleanup
  setTimeout(() => {
    pruneOldChunk(filename, filePath);
  }, config.retentionMinutes * 60 * 1000);
}

// Prune old chunks
function pruneOldChunk(filename, filePath) {
  console.log(`\n🧹 Pruning old chunk: ${filename}`);

  // Destroy torrent
  const torrent = state.activeTorrents.get(filename);
  if (torrent) {
    console.log(`   🛑 Stopping seeding (uploaded: ${(torrent.uploaded / 1024 / 1024).toFixed(2)} MB)`);
    torrent.destroy(() => {
      console.log(`   ✅ Torrent destroyed: ${filename}`);
    });
    state.activeTorrents.delete(filename);
  }

  // Delete local file (optional - Owncast may already clean these)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`   🗑️  Local file deleted: ${filename}`);
    } catch (err) {
      console.warn(`   ⚠️  Could not delete file: ${err.message}`);
    }
  }

  state.processedChunks.delete(filename);
}

// Watch Owncast output directory
console.log(`👀 Watching Owncast directory: ${chunksDir}\n`);

const watcher = chokidar.watch(chunksDir, {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: false, // Process existing files
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100,
  },
});

watcher.on('add', (filePath) => {
  processChunk(filePath);
});

watcher.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcher.on('ready', () => {
  console.log('✅ File watcher ready\n');
});

// Connect to signaling server
connectSignaling();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  watcher.close();
  
  // Destroy all torrents
  state.activeTorrents.forEach((torrent, filename) => {
    console.log(`   🛑 Destroying torrent: ${filename}`);
    torrent.destroy();
  });
  
  // Close signaling connection
  if (state.signalingWs) {
    state.signalingWs.close();
  }
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ Shutdown complete');
    process.exit(0);
  });
});

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('✅ Broadcaster service ready\n');
console.log('📊 Service Status:');
console.log(`   - HTTP Server: http://localhost:${config.httpPort}`);
console.log(`   - Health Check: http://localhost:${config.httpPort}/health`);
console.log(`   - Metrics: http://localhost:${config.httpPort}/metrics`);
console.log(`   - Signaling: ${config.signalingUrl}`);
console.log(`   - Retention: ${config.retentionMinutes} minutes`);
console.log(`   - Trackers: ${config.trackers.length} configured\n`);
console.log('Waiting for Owncast to create HLS segments...\n');
console.log('='.repeat(80) + '\n');

