// WebTorrent Live Streaming Viewer
// Handles P2P downloads with HTTP fallback and MediaSource Extensions playback

const CONFIG = {
  signalingUrl: 'ws://localhost:8080',
  p2pTimeout: 5000, // 5 second timeout for P2P attempts
  httpFallbackThreshold: 3, // Switch to HTTP-only after N consecutive P2P failures
  bufferTarget: 3, // Target number of chunks to buffer
  maxBufferSize: 60, // Maximum seconds to buffer
  trackers: [
    'udp://tracker.qu.ax:6969/announce',
    'udp://tracker.plx.im:6969/announce',
    'udp://tracker.torrent.eu.org:451/announce'
  ],
};

// State management
const state = {
  ws: null,
  wtClient: null,
  mediaSource: null,
  sourceBuffer: null,
  video: null,
  
  chunks: [], // Received chunk info from signaling
  downloadedChunks: new Set(), // Track what we've already downloaded
  chunkQueue: [], // Queue of chunks to process
  
  stats: {
    peers: 0,
    chunksLoaded: 0,
    p2pBytes: 0,
    httpBytes: 0,
    p2pFailures: 0,
    consecutiveP2PFailures: 0,
  },
  
  mode: 'p2p', // 'p2p' or 'http'
  isInitialized: false,
  isPlaying: false,
};

// UI Elements
const ui = {
  video: document.getElementById('video-player'),
  loadingOverlay: document.getElementById('loading-overlay'),
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  modeBadge: document.getElementById('mode-badge'),
  peerCount: document.getElementById('peer-count'),
  chunksLoaded: document.getElementById('chunks-loaded'),
  p2pDownloaded: document.getElementById('p2p-downloaded'),
  httpDownloaded: document.getElementById('http-downloaded'),
  latency: document.getElementById('latency'),
  bufferHealth: document.getElementById('buffer-health'),
  logPanel: document.getElementById('log-panel'),
};

state.video = ui.video;

// Logging
function log(message, type = 'info') {
  const now = new Date();
  const time = now.toLocaleTimeString();
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span>${message}</span>`;
  
  ui.logPanel.appendChild(entry);
  ui.logPanel.scrollTop = ui.logPanel.scrollHeight;
  
  // Keep only last 50 entries
  while (ui.logPanel.children.length > 50) {
    ui.logPanel.removeChild(ui.logPanel.firstChild);
  }
  
  console.log(`[${type.toUpperCase()}]`, message);
}

// Update UI
function updateUI() {
  ui.peerCount.textContent = state.stats.peers;
  ui.chunksLoaded.textContent = state.stats.chunksLoaded;
  ui.p2pDownloaded.textContent = (state.stats.p2pBytes / 1024 / 1024).toFixed(2) + ' MB';
  ui.httpDownloaded.textContent = (state.stats.httpBytes / 1024 / 1024).toFixed(2) + ' MB';
  
  // Calculate latency (time since latest chunk timestamp)
  if (state.chunks.length > 0) {
    const latestChunk = state.chunks[state.chunks.length - 1];
    const latencySeconds = (Date.now() - latestChunk.timestamp) / 1000;
    ui.latency.textContent = latencySeconds.toFixed(1) + ' s';
  }
  
  // Buffer health
  if (state.sourceBuffer && state.sourceBuffer.buffered.length > 0) {
    const bufferedSeconds = state.sourceBuffer.buffered.end(0) - state.video.currentTime;
    ui.bufferHealth.textContent = bufferedSeconds.toFixed(1) + ' s';
    
    // Warning if buffer is low
    if (bufferedSeconds < 5) {
      ui.bufferHealth.classList.add('warning');
    } else {
      ui.bufferHealth.classList.remove('warning');
    }
  }
  
  // Mode badge
  ui.modeBadge.textContent = state.mode === 'p2p' ? 'P2P MODE' : 'HTTP MODE';
  ui.modeBadge.className = 'mode-badge' + (state.mode === 'http' ? ' http-mode' : '');
}

// Initialize WebTorrent
function initWebTorrent() {
  log('Initializing WebTorrent client...');
  
  state.wtClient = new WebTorrent({
    tracker: {
      announce: CONFIG.trackers,
    },
  });
  
  state.wtClient.on('error', (err) => {
    log(`WebTorrent error: ${err.message}`, 'error');
  });
  
  // Monitor total peer count
  setInterval(() => {
    let totalPeers = 0;
    state.wtClient.torrents.forEach(t => {
      totalPeers += t.numPeers;
    });
    state.stats.peers = totalPeers;
    updateUI();
  }, 2000);
  
  log('WebTorrent client ready', 'info');
}

// Initialize MediaSource Extensions
function initMediaSource() {
  log('Initializing MediaSource...');
  
  state.mediaSource = new MediaSource();
  ui.video.src = URL.createObjectURL(state.mediaSource);
  
  state.mediaSource.addEventListener('sourceopen', () => {
    try {
      // Use MP2T codec for HLS .ts files
      const mimeCodec = 'video/mp2t; codecs="avc1.42E01E, mp4a.40.2"';
      
      if (!MediaSource.isTypeSupported(mimeCodec)) {
        log('Codec not supported: ' + mimeCodec, 'error');
        // Try alternative
        const altCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
        if (MediaSource.isTypeSupported(altCodec)) {
          state.sourceBuffer = state.mediaSource.addSourceBuffer(altCodec);
          log('Using alternative codec: ' + altCodec, 'warn');
        } else {
          log('No supported codec found!', 'error');
          return;
        }
      } else {
        state.sourceBuffer = state.mediaSource.addSourceBuffer(mimeCodec);
      }
      
      state.sourceBuffer.mode = 'sequence';
      
      state.sourceBuffer.addEventListener('updateend', () => {
        processNextChunk();
        manageBuffer();
      });
      
      state.sourceBuffer.addEventListener('error', (e) => {
        log('SourceBuffer error: ' + e, 'error');
      });
      
      state.isInitialized = true;
      log('MediaSource initialized successfully', 'info');
      ui.loadingOverlay.classList.add('hidden');
      
    } catch (err) {
      log('Failed to initialize SourceBuffer: ' + err.message, 'error');
    }
  });
  
  state.mediaSource.addEventListener('error', (e) => {
    log('MediaSource error: ' + e, 'error');
  });
}

// Manage buffer (remove old data to prevent overflow)
function manageBuffer() {
  if (!state.sourceBuffer || state.sourceBuffer.updating) {
    return;
  }
  
  try {
    if (state.sourceBuffer.buffered.length > 0) {
      const bufferedEnd = state.sourceBuffer.buffered.end(0);
      const currentTime = ui.video.currentTime;
      
      // Remove data older than 30 seconds behind current playhead
      if (bufferedEnd - currentTime > CONFIG.maxBufferSize) {
        const removeEnd = currentTime - 30;
        if (removeEnd > 0) {
          state.sourceBuffer.remove(0, removeEnd);
          log(`Removed buffer up to ${removeEnd.toFixed(1)}s`, 'info');
        }
      }
    }
  } catch (err) {
    log('Buffer management error: ' + err.message, 'warn');
  }
}

// Download chunk via WebTorrent P2P
function downloadViaP2P(chunkInfo) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      log(`P2P timeout for ${chunkInfo.filename}`, 'warn');
      reject(new Error('P2P timeout'));
    }, CONFIG.p2pTimeout);
    
    try {
      state.wtClient.add(chunkInfo.magnet, { announce: CONFIG.trackers }, (torrent) => {
        log(`Downloading ${chunkInfo.filename} via P2P (${torrent.numPeers} peers)`, 'info');
        
        const file = torrent.files[0];
        
        file.getBuffer((err, buffer) => {
          clearTimeout(timeout);
          
          if (err) {
            log(`P2P download failed: ${err.message}`, 'error');
            torrent.destroy();
            reject(err);
            return;
          }
          
          state.stats.p2pBytes += buffer.length;
          log(`P2P download complete: ${chunkInfo.filename} (${(buffer.length / 1024).toFixed(2)} KB)`, 'info');
          
          // Destroy torrent after download to free resources
          torrent.destroy();
          
          resolve(buffer);
        });
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// Download chunk via HTTP fallback
async function downloadViaHTTP(chunkInfo) {
  const url = chunkInfo.r2 || chunkInfo.http;
  
  if (!url) {
    throw new Error('No HTTP URL available');
  }
  
  log(`Downloading ${chunkInfo.filename} via HTTP`, 'info');
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    state.stats.httpBytes += buffer.byteLength;
    
    log(`HTTP download complete: ${chunkInfo.filename} (${(buffer.byteLength / 1024).toFixed(2)} KB)`, 'info');
    
    return buffer;
  } catch (err) {
    log(`HTTP download failed: ${err.message}`, 'error');
    throw err;
  }
}

// Download and append chunk
async function downloadAndAppendChunk(chunkInfo) {
  if (state.downloadedChunks.has(chunkInfo.filename)) {
    return; // Already downloaded
  }
  
  state.downloadedChunks.add(chunkInfo.filename);
  
  let buffer;
  
  // Try P2P first if in P2P mode
  if (state.mode === 'p2p') {
    try {
      buffer = await downloadViaP2P(chunkInfo);
      state.stats.consecutiveP2PFailures = 0; // Reset failure counter
    } catch (err) {
      // P2P failed, try HTTP
      log('P2P failed, falling back to HTTP...', 'warn');
      state.stats.p2pFailures++;
      state.stats.consecutiveP2PFailures++;
      
      // Switch to HTTP-only mode if too many failures
      if (state.stats.consecutiveP2PFailures >= CONFIG.httpFallbackThreshold) {
        log(`Switching to HTTP-only mode after ${CONFIG.httpFallbackThreshold} failures`, 'warn');
        state.mode = 'http';
        ui.statusIndicator.className = 'status-indicator http';
        ui.statusText.textContent = 'Using HTTP fallback (P2P unavailable)';
      }
      
      buffer = await downloadViaHTTP(chunkInfo);
    }
  } else {
    // Already in HTTP mode
    buffer = await downloadViaHTTP(chunkInfo);
  }
  
  // Add to queue for appending
  state.chunkQueue.push({
    buffer: new Uint8Array(buffer),
    info: chunkInfo,
  });
  
  state.stats.chunksLoaded++;
  updateUI();
  
  // Start processing if not already
  if (!state.sourceBuffer.updating) {
    processNextChunk();
  }
}

// Process next chunk in queue
function processNextChunk() {
  if (state.chunkQueue.length === 0 || !state.sourceBuffer || state.sourceBuffer.updating) {
    return;
  }
  
  const chunk = state.chunkQueue.shift();
  
  try {
    state.sourceBuffer.appendBuffer(chunk.buffer);
    log(`Appended ${chunk.info.filename} to buffer`, 'info');
    
    // Start playback if not started yet
    if (!state.isPlaying && state.sourceBuffer.buffered.length > 0) {
      ui.video.play().then(() => {
        state.isPlaying = true;
        log('Playback started', 'info');
      }).catch(err => {
        log('Playback failed: ' + err.message, 'error');
      });
    }
  } catch (err) {
    log('Failed to append buffer: ' + err.message, 'error');
  }
}

// Connect to signaling server
function connectSignaling() {
  log('Connecting to signaling server...');
  ui.statusIndicator.className = 'status-indicator';
  ui.statusText.textContent = 'Connecting to signaling server...';
  
  state.ws = new WebSocket(CONFIG.signalingUrl);
  
  state.ws.onopen = () => {
    log('Connected to signaling server', 'info');
    ui.statusIndicator.className = 'status-indicator connected';
    ui.statusText.textContent = 'Connected - Waiting for stream...';
  };
  
  state.ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'manifest') {
        log(`Received manifest with ${message.chunks.length} chunks`, 'info');
        state.chunks = message.chunks;
        
        // Download latest chunks
        for (const chunk of message.chunks.slice(-CONFIG.bufferTarget)) {
          await downloadAndAppendChunk(chunk);
        }
      }
      
      if (message.type === 'chunk') {
        log(`New chunk available: ${message.filename}`, 'info');
        state.chunks.push(message);
        
        // Download immediately
        await downloadAndAppendChunk(message);
      }
      
      if (message.type === 'server_shutdown') {
        log('Server is shutting down', 'warn');
      }
      
    } catch (err) {
      log('Error processing message: ' + err.message, 'error');
    }
  };
  
  state.ws.onerror = (err) => {
    log('WebSocket error', 'error');
    ui.statusIndicator.className = 'status-indicator error';
    ui.statusText.textContent = 'Connection error';
  };
  
  state.ws.onclose = () => {
    log('Disconnected from signaling server. Reconnecting in 5s...', 'warn');
    ui.statusIndicator.className = 'status-indicator error';
    ui.statusText.textContent = 'Disconnected - Reconnecting...';
    
    setTimeout(connectSignaling, 5000);
  };
}

// Initialize everything
function init() {
  log('Initializing viewer...', 'info');
  
  initWebTorrent();
  initMediaSource();
  connectSignaling();
  
  // Update UI periodically
  setInterval(updateUI, 1000);
  
  log('Viewer initialized', 'info');
}

// Start on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle visibility change (pause/resume)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    log('Tab hidden, pausing...', 'info');
  } else {
    log('Tab visible, resuming...', 'info');
  }
});

// Expose for debugging
window.streamDebug = {
  state,
  downloadViaP2P,
  downloadViaHTTP,
  wtClient: () => state.wtClient,
};

