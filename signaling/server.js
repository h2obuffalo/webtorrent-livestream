require('dotenv').config({ path: '../.env' });
const WebSocket = require('ws');

// Configuration
const config = {
  port: parseInt(process.env.WS_PORT) || 8080,
  maxManifestChunks: 20, // Keep last N chunks in manifest
  enableDebug: process.env.ENABLE_DEBUG_LOGGING === 'true',
};

// State management
const state = {
  chunks: [], // Array of chunk objects {seq, filename, magnet, http, r2, timestamp, ...}
  viewers: new Set(), // Set of viewer WebSocket connections
  broadcasters: new Set(), // Set of broadcaster WebSocket connections
  stats: {
    totalChunks: 0,
    totalViewers: 0,
    startTime: Date.now(),
  },
};

console.log('🚀 WebSocket Signaling Server Starting...\n');

// Create WebSocket server
const wss = new WebSocket.Server({ port: config.port });

wss.on('listening', () => {
  console.log(`✅ Signaling server listening on port ${config.port}`);
  console.log(`   ws://localhost:${config.port}\n`);
  console.log('Waiting for connections...\n');
  console.log('='.repeat(80) + '\n');
});

// Handle new connections
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const clientId = Math.random().toString(36).substring(7);
  
  console.log(`🔌 New connection from ${clientIp} (ID: ${clientId})`);

  // Track as viewer initially (will change if they send chunk data)
  let clientType = 'viewer';
  state.viewers.add(ws);
  state.stats.totalViewers++;

  // Send current manifest to new viewer
  if (state.chunks.length > 0) {
    const manifest = {
      type: 'manifest',
      chunks: state.chunks,
      stats: {
        totalChunks: state.stats.totalChunks,
        activeViewers: state.viewers.size,
        serverUptime: Date.now() - state.stats.startTime,
      },
    };

    try {
      ws.send(JSON.stringify(manifest));
      console.log(`   📋 Sent manifest with ${state.chunks.length} chunks to ${clientId}`);
    } catch (err) {
      console.error(`   ❌ Failed to send manifest: ${err.message}`);
    }
  } else {
    console.log(`   ℹ️  No chunks available yet for ${clientId}`);
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (config.enableDebug) {
        console.log(`📥 Message from ${clientId} (${clientType}):`, message.type);
      }

      // Handle chunk announcement from broadcaster
      if (message.type === 'chunk') {
        // This is a broadcaster
        if (clientType === 'viewer') {
          state.viewers.delete(ws);
          state.broadcasters.add(ws);
          clientType = 'broadcaster';
          console.log(`   🎙️  Client ${clientId} identified as broadcaster`);
        }

        // Add chunk to manifest
        const chunkInfo = {
          seq: message.seq,
          filename: message.filename,
          magnet: message.magnet,
          http: message.http,
          r2: message.r2,
          timestamp: message.timestamp,
          size: message.size,
          infoHash: message.infoHash,
        };

        state.chunks.push(chunkInfo);
        state.stats.totalChunks++;

        // Keep only last N chunks
        if (state.chunks.length > config.maxManifestChunks) {
          const removed = state.chunks.shift();
          console.log(`   🗑️  Removed old chunk from manifest: ${removed.filename}`);
        }

        console.log(`\n📦 New chunk #${message.seq}: ${message.filename}`);
        console.log(`   📡 InfoHash: ${message.infoHash.substring(0, 20)}...`);
        console.log(`   👥 Broadcasting to ${state.viewers.size} viewers`);

        // Broadcast to all viewers
        let successCount = 0;
        let failCount = 0;

        state.viewers.forEach((viewerWs) => {
          if (viewerWs.readyState === WebSocket.OPEN) {
            try {
              viewerWs.send(JSON.stringify({
                type: 'chunk',
                ...chunkInfo,
              }));
              successCount++;
            } catch (err) {
              console.error(`   ❌ Failed to send to viewer: ${err.message}`);
              failCount++;
            }
          }
        });

        console.log(`   ✅ Sent to ${successCount} viewers`);
        if (failCount > 0) {
          console.log(`   ❌ Failed to send to ${failCount} viewers`);
        }
        console.log('');
      }

      // Handle ping from clients
      if (message.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now(),
        }));
      }

      // Handle viewer stats request
      if (message.type === 'stats') {
        ws.send(JSON.stringify({
          type: 'stats',
          totalChunks: state.stats.totalChunks,
          manifestChunks: state.chunks.length,
          activeViewers: state.viewers.size,
          activeBroadcasters: state.broadcasters.size,
          serverUptime: Date.now() - state.stats.startTime,
        }));
      }

    } catch (err) {
      console.error(`❌ Error processing message from ${clientId}:`, err.message);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`❌ Client disconnected: ${clientId} (${clientType})`);
    
    if (clientType === 'viewer') {
      state.viewers.delete(ws);
    } else {
      state.broadcasters.delete(ws);
    }

    console.log(`   👥 Active viewers: ${state.viewers.size}`);
    console.log(`   🎙️  Active broadcasters: ${state.broadcasters.size}\n`);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`❌ WebSocket error from ${clientId}:`, err.message);
  });
});

// Periodic stats logging
setInterval(() => {
  if (state.viewers.size > 0 || state.broadcasters.size > 0) {
    console.log('📊 Server Stats:');
    console.log(`   Active Viewers: ${state.viewers.size}`);
    console.log(`   Active Broadcasters: ${state.broadcasters.size}`);
    console.log(`   Manifest Chunks: ${state.chunks.length}`);
    console.log(`   Total Chunks Processed: ${state.stats.totalChunks}`);
    console.log(`   Server Uptime: ${Math.floor((Date.now() - state.stats.startTime) / 1000 / 60)} minutes\n`);
  }
}, 60000); // Every minute

// Periodic connection cleanup (remove dead connections)
setInterval(() => {
  let removedViewers = 0;
  let removedBroadcasters = 0;

  state.viewers.forEach((ws) => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      state.viewers.delete(ws);
      removedViewers++;
    }
  });

  state.broadcasters.forEach((ws) => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      state.broadcasters.delete(ws);
      removedBroadcasters++;
    }
  });

  if (removedViewers > 0 || removedBroadcasters > 0) {
    console.log(`🧹 Cleaned up ${removedViewers} dead viewer connections, ${removedBroadcasters} broadcaster connections`);
  }
}, 30000); // Every 30 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  // Notify all clients
  const shutdownMsg = JSON.stringify({
    type: 'server_shutdown',
    message: 'Server is shutting down',
  });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(shutdownMsg);
        ws.close();
      } catch (err) {
        // Ignore errors during shutdown
      }
    }
  });

  wss.close(() => {
    console.log('✅ Shutdown complete');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('⚠️  Forcing exit...');
    process.exit(1);
  }, 5000);
});

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

wss.on('error', (err) => {
  console.error('❌ WebSocket server error:', err);
  process.exit(1);
});

console.log('✅ Signaling server ready');
console.log('📊 Configuration:');
console.log(`   - Port: ${config.port}`);
console.log(`   - Max Manifest Chunks: ${config.maxManifestChunks}`);
console.log(`   - Debug Logging: ${config.enableDebug}\n`);

