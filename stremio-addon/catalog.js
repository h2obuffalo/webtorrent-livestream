/**
 * Stremio Catalog Handler
 * Returns list of available streams
 */

function getCatalog(type, id, state, config) {
  // Only handle TV type for live streams
  if (type !== 'tv' || id !== 'live-streams') {
    return { metas: [] };
  }

  const metas = [];

  // Add live stream if currently streaming
  if (state.isLive && state.playlist.getChunkCount() > 0) {
    metas.push({
      id: 'livestream:current',
      type: 'tv',
      name: config.addonName || 'Live Event Stream',
      poster: 'https://via.placeholder.com/300x450.png?text=LIVE', // TODO: Replace
      background: 'https://via.placeholder.com/1920x1080.png?text=Background', // TODO: Replace
      description: 'Live event streaming via P2P and HTTP. Click to watch!',
      releaseInfo: new Date().getFullYear().toString(),
      genres: ['Live', 'Event'],
      runtime: 'LIVE',
      links: [],
      // Show live indicator
      behaviorHints: {
        defaultVideoId: 'current'
      }
    });
  } else {
    // Show "waiting for stream" placeholder
    metas.push({
      id: 'livestream:waiting',
      type: 'tv',
      name: 'Waiting for Stream',
      poster: 'https://via.placeholder.com/300x450.png?text=Offline', // TODO: Replace
      description: 'Stream is currently offline. Check back soon!',
      releaseInfo: new Date().getFullYear().toString(),
      genres: ['Live'],
      runtime: 'Offline',
      links: []
    });
  }

  return { metas };
}

module.exports = { getCatalog };

