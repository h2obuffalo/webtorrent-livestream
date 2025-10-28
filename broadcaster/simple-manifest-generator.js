/**
 * Simple HLS Manifest Generator
 * Mirrors Owncast's format but with R2 URLs and more buffer
 * 
 * Lessons learned from old version:
 * - Keep it simple (no complex discontinuity logic)
 * - Mirror existing formats exactly (copy Owncast's structure)
 * - Minimal state (fewer variables = fewer sync issues)
 * - Trust the data (no duplicate detection)
 * - Use direct seq field (no filename parsing)
 */

class SimpleManifestGenerator {
  constructor(config = {}) {
    this.chunks = [];
    this.maxChunks = config.maxChunks || 120; // 10 minutes @ 6s/chunk (more buffer than Owncast)
    this.targetDuration = config.targetDuration || 6;
    this.mediaSequence = 0;
    this.sessionId = null;
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
    // Only add if we have R2 URL
    if (!chunkInfo.r2) {
      console.warn(`⚠️ Skipping chunk ${chunkInfo.filename} - no R2 URL`);
      return false;
    }

    // Extract session ID from R2 URL (format: .../live/{sessionId}/{filename})
    const sessionMatch = chunkInfo.r2.match(/\/live\/(\d+)\//);
    const newSessionId = sessionMatch ? sessionMatch[1] : null;
    
    // Update session ID if changed (simple session change detection)
    if (newSessionId && newSessionId !== this.sessionId) {
      console.log(`🔄 Session change: ${this.sessionId} → ${newSessionId}`);
      this.sessionId = newSessionId;
      this.mediaSequence = chunkInfo.seq || 0; // Reset sequence for new session
    }

    // Add chunk (trust broadcaster to handle duplicates)
    this.chunks.push({
      filename: chunkInfo.filename,
      r2Url: chunkInfo.r2,
      duration: this.targetDuration,
      seq: chunkInfo.seq || 0,
      timestamp: chunkInfo.timestamp || Date.now()
    });

    // Keep only recent chunks (simple cleanup)
    if (this.chunks.length > this.maxChunks) {
      this.chunks.shift();
    }

    console.log(`📋 Added ${chunkInfo.filename} to manifest (${this.chunks.length}/${this.maxChunks} chunks)`);
    return true;
  }

  /**
   * Generate HLS manifest (mirrors Owncast's format exactly)
   * @returns {string} M3U8 playlist content
   */
  generateManifest() {
    if (this.chunks.length === 0) {
      // Return minimal valid playlist if no chunks
      return [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:' + this.targetDuration,
        '#EXT-X-MEDIA-SEQUENCE:0',
        '# No chunks available yet'
      ].join('\n');
    }

    // Sort by sequence number (direct seq field, no filename parsing)
    const sortedChunks = [...this.chunks].sort((a, b) => a.seq - b.seq);
    
    // Use first chunk's sequence as media sequence
    const mediaSequence = sortedChunks[0].seq;
    const programStartTime = new Date(sortedChunks[0].timestamp);

    // Build manifest (exactly like Owncast's format)
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:' + this.targetDuration,
      '#EXT-X-MEDIA-SEQUENCE:' + mediaSequence,
      '#EXT-X-PLAYLIST-TYPE:EVENT',
      `#EXT-X-PROGRAM-DATE-TIME:${programStartTime.toISOString()}`,
      `#EXT-X-PROGRAM-DATE-TIME:${programStartTime.toISOString()}` // Duplicate like Owncast
    ];

    // Add each chunk (simple, no complex timing calculations)
    for (const chunk of sortedChunks) {
      lines.push(`#EXTINF:${chunk.duration}.000,`);
      lines.push(chunk.r2Url); // R2 URL instead of localhost
    }

    return lines.join('\n');
  }

  /**
   * Get manifest statistics
   * @returns {Object} Stats about the manifest
   */
  getStats() {
    return {
      chunkCount: this.chunks.length,
      maxChunks: this.maxChunks,
      sessionId: this.sessionId,
      mediaSequence: this.mediaSequence,
      oldestChunk: this.chunks[0]?.filename || null,
      newestChunk: this.chunks[this.chunks.length - 1]?.filename || null
    };
  }

  /**
   * Clear all chunks (for stream restart)
   */
  clear() {
    this.chunks = [];
    this.sessionId = null;
    this.mediaSequence = 0;
    console.log('🧹 Manifest cleared');
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

module.exports = SimpleManifestGenerator;
