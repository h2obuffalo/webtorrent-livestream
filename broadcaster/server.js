require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const WebTorrent = require('webtorrent-hybrid');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { uploadToR2, verifyR2Connection } = require('./r2-uploader');

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
};

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    torrents: state.activeTorrents.size,
    peers: Array.from(state.activeTorrents.values()).reduce((sum, t) => sum + t.numPeers, 0),
    chunks: state.chunkSequence,
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

  state.processedChunks.add(filename);
  state.chunkSequence++;

  console.log(`\n📦 New chunk detected: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

  const seq = state.chunkSequence;
  const timestamp = Date.now();

  // 1. Seed with WebTorrent
  console.log('   🌱 Seeding via WebTorrent...');
  
  wtClient.seed(filePath, { 
    announce: config.trackers,
    name: filename,
  }, (torrent) => {
    console.log(`   ✅ Seeding: ${torrent.infoHash.substring(0, 20)}...`);
    console.log(`   📡 Magnet: ${torrent.magnetURI.substring(0, 80)}...`);
    
    // Store torrent reference
    state.activeTorrents.set(filename, torrent);

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

  // 2. Upload to R2
  console.log('   ☁️  Uploading to Cloudflare R2...');
  
  const r2Key = `${config.r2Path}${filename}`;
  const r2Url = await uploadToR2(filePath, r2Key);
  
  if (r2Url) {
    console.log(`   ✅ R2 upload complete: ${r2Url}`);
  } else {
    console.error(`   ❌ R2 upload failed for ${filename}`);
  }

  // 3. Get magnet URI (wait briefly for torrent to be ready)
  setTimeout(() => {
    const torrent = state.activeTorrents.get(filename);
    if (torrent) {
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

      // 4. Notify signaling server
      notifySignaling(chunkInfo);
    }
  }, 1000);

  // 5. Schedule cleanup
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

