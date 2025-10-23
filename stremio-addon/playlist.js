/**
 * Playlist Manager
 * Manages the list of available chunks for streaming
 */

class PlaylistManager {
  constructor(maxChunks = 20) {
    this.chunks = [];
    this.maxChunks = maxChunks;
    this.chunkMap = new Map(); // filename -> chunk info
  }

  /**
   * Add a new chunk to the playlist
   */
  addChunk(chunkInfo) {
    // Avoid duplicates
    if (this.chunkMap.has(chunkInfo.filename)) {
      return;
    }

    // Add to list
    this.chunks.push(chunkInfo);
    this.chunkMap.set(chunkInfo.filename, chunkInfo);

    // Keep only last N chunks
    if (this.chunks.length > this.maxChunks) {
      const removed = this.chunks.shift();
      this.chunkMap.delete(removed.filename);
    }
  }

  /**
   * Get latest chunk
   */
  getLatestChunk() {
    if (this.chunks.length === 0) {
      return null;
    }
    return this.chunks[this.chunks.length - 1];
  }

  /**
   * Get all chunks
   */
  getAllChunks() {
    return this.chunks;
  }

  /**
   * Get chunk count
   */
  getChunkCount() {
    return this.chunks.length;
  }

  /**
   * Get chunk by filename
   */
  getChunk(filename) {
    return this.chunkMap.get(filename);
  }

  /**
   * Get recent chunks (last N)
   */
  getRecentChunks(count = 10) {
    return this.chunks.slice(-count);
  }

  /**
   * Clear all chunks
   */
  clear() {
    this.chunks = [];
    this.chunkMap.clear();
  }

  /**
   * Generate HLS M3U8 playlist from recent chunks
   */
  generateM3U8(baseUrl, chunkCount = 10) {
    const recentChunks = this.getRecentChunks(chunkCount);
    
    if (recentChunks.length === 0) {
      return null;
    }

    // Build M3U8 playlist
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:10', // Adjust based on chunk duration
      '#EXT-X-MEDIA-SEQUENCE:0',
    ];

    // Add chunks
    recentChunks.forEach(chunk => {
      lines.push(`#EXTINF:4.0,`); // Assume 4 second chunks
      lines.push(chunk.r2 || chunk.http); // Use R2 URL if available, else HTTP
    });

    return lines.join('\n');
  }

  /**
   * Get stats
   */
  getStats() {
    const totalSize = this.chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0);
    
    return {
      chunkCount: this.chunks.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      oldestChunk: this.chunks[0]?.filename,
      latestChunk: this.getLatestChunk()?.filename,
      timeRange: this.chunks.length > 0 ? 
        (this.chunks[this.chunks.length - 1].timestamp - this.chunks[0].timestamp) / 1000 : 0
    };
  }
}

module.exports = { PlaylistManager };

