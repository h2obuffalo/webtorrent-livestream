/**
 * HLS Manifest Generator
 * Creates dynamic .m3u8 playlists with Cloudflare R2 URLs for HTTP fallback
 * This ensures viewers use R2 instead of AWS EC2 for chunk downloads
 */

class ManifestGenerator {
  constructor(config = {}) {
    this.chunks = [];
    this.maxChunks = config.maxChunks || 10;
    this.targetDuration = config.targetDuration || 6; // Default 6 seconds
    this.sequenceNumber = 0;
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

    // Add chunk to list
    this.chunks.push({
      filename: chunkInfo.filename,
      url: chunkInfo.r2, // Use R2 URL, not localhost
      duration: this.targetDuration,
      size: chunkInfo.size,
      timestamp: chunkInfo.timestamp,
      seq: chunkInfo.seq,
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

    // Add each chunk
    for (const chunk of this.chunks) {
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

