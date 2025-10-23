require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { getManifest } = require('./manifest');
const { getCatalog } = require('./catalog');
const { getStream } = require('./stream');
const { PlaylistManager } = require('./playlist');

// Configuration
const config = {
  port: parseInt(process.env.STREMIO_PORT) || 7000,
  signalingUrl: process.env.SIGNALING_URL || 'ws://localhost:8080',
  addonName: process.env.ADDON_NAME || 'Live Event Stream',
  cdnBaseUrl: process.env.CDN_HOSTNAME ? `https://${process.env.CDN_HOSTNAME}` : 'http://localhost:3000',
};

// State
const state = {
  signalingWs: null,
  playlist: new PlaylistManager(),
  isLive: false,
};

console.log('🎬 Stremio Addon Server Starting...\n');

// Create Express app
const app = express();

// CORS - Stremio needs this
app.use(cors());

// JSON middleware
app.use(express.json());

// ===== Stremio Addon Endpoints =====

// Manifest - describes the addon
app.get('/manifest.json', (req, res) => {
  const manifest = getManifest(config);
  res.json(manifest);
});

// Catalog - list of available streams
app.get('/catalog/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  const catalog = getCatalog(type, id, state, config);
  res.json(catalog);
});

// Stream - returns magnet URIs or HTTP URLs for playback
app.get('/stream/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  const streams = getStream(type, id, state, config);
  res.json(streams);
});

// ===== Helper Endpoints =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    isLive: state.isLive,
    chunks: state.playlist.getChunkCount(),
    signaling: state.signalingWs?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
  });
});

// Playlist info (for debugging)
app.get('/playlist', (req, res) => {
  res.json({
    chunks: state.playlist.getAllChunks(),
    count: state.playlist.getChunkCount(),
    latest: state.playlist.getLatestChunk(),
  });
});

// Landing page with install instructions
app.get('/', (req, res) => {
  const installUrl = `stremio://${req.get('host')}/manifest.json`;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${config.addonName} - Stremio Addon</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          padding: 40px 20px;
          text-align: center;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          padding: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          color: #aaa;
          margin-bottom: 30px;
        }
        .install-btn {
          display: inline-block;
          background: #4ecdc4;
          color: #000;
          padding: 15px 30px;
          font-size: 1.2rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          transition: transform 0.1s;
        }
        .install-btn:hover {
          transform: scale(1.05);
        }
        .status {
          margin: 30px 0;
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }
        .status-label {
          color: #888;
          font-size: 0.9rem;
          margin-bottom: 5px;
        }
        .status-value {
          color: #4ecdc4;
          font-size: 1.2rem;
          font-weight: 600;
        }
        .instructions {
          text-align: left;
          margin-top: 30px;
        }
        .instructions ol {
          padding-left: 20px;
        }
        .instructions li {
          margin: 10px 0;
          line-height: 1.6;
        }
        code {
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 ${config.addonName}</h1>
        <p class="subtitle">Stremio Addon for P2P Live Streaming</p>
        
        <a href="${installUrl}" class="install-btn">📥 Install Addon</a>
        
        <div class="status">
          <div class="status-label">Stream Status</div>
          <div class="status-value">${state.isLive ? '🔴 LIVE' : '⚪ Offline'}</div>
        </div>
        
        <div class="status">
          <div class="status-label">Available Chunks</div>
          <div class="status-value">${state.playlist.getChunkCount()}</div>
        </div>
        
        <div class="instructions">
          <h3>How to Install:</h3>
          <ol>
            <li>Install <strong>Stremio</strong> on your device</li>
            <li>Click the <strong>"Install Addon"</strong> button above</li>
            <li>Open <strong>Stremio</strong> and go to <strong>Discover</strong></li>
            <li>Find <strong>"${config.addonName}"</strong> in your library</li>
            <li>Click to start watching!</li>
          </ol>
          
          <h3>Manual Installation:</h3>
          <p>Copy this URL into Stremio → Addons → Community Addons → Install from URL:</p>
          <code>http://${req.get('host')}/manifest.json</code>
          
          <h3>Platforms:</h3>
          <ul>
            <li>✅ Fire TV - Native app</li>
            <li>✅ Apple TV - Native app</li>
            <li>✅ iOS - Native app</li>
            <li>✅ Android TV - Native app</li>
            <li>✅ Android - Native app + Chromecast</li>
            <li>✅ Desktop - Windows, macOS, Linux</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`✅ Stremio addon listening on port ${config.port}`);
  console.log(`   http://localhost:${config.port}\n`);
  console.log(`📦 Install URL: stremio://localhost:${config.port}/manifest.json`);
  console.log(`   Or visit: http://localhost:${config.port}/\n`);
});

// ===== Connect to Signaling Server =====

function connectSignaling() {
  try {
    state.signalingWs = new WebSocket(config.signalingUrl);

    state.signalingWs.on('open', () => {
      console.log('✅ Connected to signaling server:', config.signalingUrl);
      console.log('   Listening for new chunks...\n');
    });

    state.signalingWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle manifest (initial chunk list)
        if (message.type === 'manifest') {
          console.log(`📋 Received manifest with ${message.chunks.length} chunks`);
          message.chunks.forEach(chunk => state.playlist.addChunk(chunk));
          state.isLive = message.chunks.length > 0;
        }
        
        // Handle new chunk
        if (message.type === 'chunk') {
          console.log(`📦 New chunk: ${message.filename} (${(message.size / 1024).toFixed(2)} KB)`);
          state.playlist.addChunk(message);
          state.isLive = true;
        }
      } catch (err) {
        console.error('❌ Error processing message:', err.message);
      }
    });

    state.signalingWs.on('error', (err) => {
      console.error('❌ Signaling error:', err.message);
    });

    state.signalingWs.on('close', () => {
      console.log('⚠️  Signaling connection closed. Reconnecting in 5s...');
      setTimeout(connectSignaling, 5000);
    });

  } catch (err) {
    console.error('❌ Failed to connect to signaling:', err.message);
    setTimeout(connectSignaling, 5000);
  }
}

// Connect to signaling
connectSignaling();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  if (state.signalingWs) {
    state.signalingWs.close();
  }
  
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

console.log('✅ Stremio addon server ready');
console.log('📊 Configuration:');
console.log(`   - Port: ${config.port}`);
console.log(`   - Addon Name: ${config.addonName}`);
console.log(`   - CDN Base: ${config.cdnBaseUrl}`);
console.log(`   - Signaling: ${config.signalingUrl}\n`);
console.log('Waiting for chunks from broadcaster...\n');
console.log('='.repeat(80) + '\n');

