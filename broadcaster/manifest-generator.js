/**
 * HLS Manifest Generator
 * Creates dynamic .m3u8 playlists with Cloudflare R2 URLs for HTTP fallback
 * This ensures viewers use R2 instead of AWS EC2 for chunk downloads
 */

class ManifestGenerator {
  constructor(config = {}) {
    this.chunks = [];
    this.maxChunks = config.maxChunks || 240; // Default 240 chunks for Android TV support
    this.targetDuration = config.targetDuration || 6; // Default 6 seconds
    this.sequenceNumber = 0;
    this.currentSessionId = null; // Track current stream session
    this.discontinuitySequence = 0; // Track number of discontinuities
  }

  /**
   * Add a new chunk to the manifest
   * @param {Object} chunkInfo - Chunk information from broadcaster
   * @param {string} chunkInfo.filename - Chunk filename
   * @param {string} chunkInfo.r2 - Cloudflare R2 URL
   * @param {number} chunkInfo.size - Chunk size in bytes
   * @param {number} chunkInfo.timestamp - Timestamp
   * @param {number} chunkInfo.seq - Sequence number
   */
  addChunk(chunkInfo) {
    // Only add if we have an R2 URL
    if (!chunkInfo.r2) {
      console.warn(`⚠️  Skipping chunk ${chunkInfo.filename} - no R2 URL`);
      return false;
    }

    // Extract session ID from R2 URL (format: .../live/{sessionId}/{filename})
    const sessionMatch = chunkInfo.r2.match(/\/live\/(\d+)\//);
    const newSessionId = sessionMatch ? sessionMatch[1] : null;
    
    // Detect session change (stream restart)
    let needsDiscontinuity = false;
    if (newSessionId && this.currentSessionId && newSessionId !== this.currentSessionId) {
      console.log(`   🔄 Session change detected: ${this.currentSessionId} → ${newSessionId}`);
      needsDiscontinuity = true;
      this.discontinuitySequence++;
    }
    
    // Update current session ID
    if (newSessionId) {
      this.currentSessionId = newSessionId;
    }

    // Add chunk to list
    this.chunks.push({
      filename: chunkInfo.filename,
      url: chunkInfo.r2, // Use R2 URL, not localhost
      duration: this.targetDuration,
      size: chunkInfo.size,
      timestamp: chunkInfo.timestamp,
      seq: chunkInfo.seq,
      sessionId: newSessionId,
      discontinuity: needsDiscontinuity, // Mark if this chunk starts a new session
    });

    // Remove oldest chunks if we exceed max
    while (this.chunks.length > this.maxChunks) {
      const removed = this.chunks.shift();
      console.log(`   🗑️  Removed old chunk from manifest: ${removed.filename}`);
    }

    return true;
  }

  /**
   * Generate HLS M3U8 playlist
   * @returns {string} M3U8 playlist content
   */
  generateManifest() {
    if (this.chunks.length === 0) {
      // Return a minimal valid playlist if no chunks
      return [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:' + this.targetDuration,
        '#EXT-X-MEDIA-SEQUENCE:0',
        '# No chunks available yet',
      ].join('\n');
    }

    // Calculate the media sequence number (based on oldest chunk)
    const mediaSequence = this.chunks[0].seq || 0;

    // Build the playlist
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:' + this.targetDuration,
      '#EXT-X-MEDIA-SEQUENCE:' + mediaSequence,
    ];
    
    // Add discontinuity sequence if we've had stream restarts
    if (this.discontinuitySequence > 0) {
      lines.push('#EXT-X-DISCONTINUITY-SEQUENCE:' + this.discontinuitySequence);
    }

    // Add each chunk
    for (const chunk of this.chunks) {
      // Add discontinuity tag before chunks that start a new session
      if (chunk.discontinuity) {
        lines.push('#EXT-X-DISCONTINUITY');
        console.log(`   📺 Added discontinuity tag for session change at ${chunk.filename}`);
      }
      
      lines.push(`#EXTINF:${chunk.duration.toFixed(3)},`);
      lines.push(chunk.url); // This is the R2 URL!
    }

    // For live streams, don't add EXT-X-ENDLIST
    // This tells the player to keep requesting the playlist

    return lines.join('\n');
  }

  /**
   * Get manifest statistics
   * @returns {Object} Stats about the manifest
   */
  getStats() {
    const totalSize = this.chunks.reduce((sum, chunk) => sum + (chunk.size || 0), 0);
    const totalDuration = this.chunks.reduce((sum, chunk) => sum + chunk.duration, 0);

    return {
      chunkCount: this.chunks.length,
      totalSize: totalSize,
      totalDuration: totalDuration,
      oldestChunk: this.chunks[0]?.filename || null,
      newestChunk: this.chunks[this.chunks.length - 1]?.filename || null,
      mediaSequence: this.chunks[0]?.seq || 0,
    };
  }

  /**
   * Clear all chunks
   */
  clear() {
    this.chunks = [];
    this.sequenceNumber = 0;
    // Note: We keep currentSessionId and discontinuitySequence
    // so we can detect session changes across clears
  }

  /**
   * Get chunk count
   * @returns {number}
   */
  getChunkCount() {
    return this.chunks.length;
  }

  /**
   * Check if manifest has chunks
   * @returns {boolean}
   */
  hasChunks() {
    return this.chunks.length > 0;
  }
}

module.exports = ManifestGenerator;

