/**
 * Stremio Addon Manifest
 * Describes what content this addon provides
 */

function getManifest(config) {
  return {
    id: 'org.webtorrent.livestream',
    version: '1.0.0',
    name: config.addonName || 'WebTorrent Live Stream',
    description: 'P2P live streaming with HTTP fallback. Works on Fire TV, Apple TV, iOS, Android TV, and Desktop with Chromecast support.',
    logo: 'https://via.placeholder.com/256x256.png?text=Live', // TODO: Replace with your logo
    background: 'https://via.placeholder.com/1920x1080.png?text=Background', // TODO: Replace
    
    // What resources this addon provides
    resources: [
      'catalog',
      'stream'
    ],
    
    // Content types
    types: ['tv', 'movie'], // tv for live streams, movie for recorded events
    
    // Catalogs this addon provides
    catalogs: [
      {
        type: 'tv',
        id: 'live-streams',
        name: 'Live Streams',
        extra: [
          { name: 'genre', isRequired: false }
        ]
      }
    ],
    
    // ID prefixes this addon handles
    idPrefixes: ['livestream:'],
    
    // Behavior hints for Stremio
    behaviorHints: {
      adult: false,
      p2p: true, // Indicate P2P support
      configurable: false, // Could make this true to add settings
    }
  };
}

module.exports = { getManifest };

