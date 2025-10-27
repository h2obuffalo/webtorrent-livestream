/**
 * R2 Proxy for HLS Chunks
 * Proxies Owncast's HLS manifest and redirects chunk requests to R2
 * This provides R2 optimization without custom manifest complexity
 */

const express = require('express');
const fetch = require('node-fetch');

class R2Proxy {
  constructor(config = {}) {
    this.owncastUrl = config.owncastUrl || 'http://localhost:8080';
    this.r2BaseUrl = config.r2BaseUrl || 'https://pub-81f1de5a4fc945bdaac36449630b5685.r2.dev';
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Proxy Owncast's HLS manifest
    this.router.get('/hls/stream.m3u8', async (req, res) => {
      try {
        const owncastResponse = await fetch(`${this.owncastUrl}/hls/stream.m3u8`);
        const manifest = await owncastResponse.text();
        
        // Replace localhost URLs with R2 URLs
        const r2Manifest = manifest.replace(
          /http:\/\/localhost:8080\/hls\/(\d+)\/([^\/\s]+\.ts)/g,
          `${this.r2BaseUrl}/live/1761573521735/$2`
        );
        
        res.set({
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        });
        
        res.send(r2Manifest);
      } catch (error) {
        console.error('Error proxying manifest:', error);
        res.status(500).send('Error loading manifest');
      }
    });

    // Proxy individual chunk requests to R2
    this.router.get('/hls/:sessionId/:filename', async (req, res) => {
      const { sessionId, filename } = req.params;
      const r2Url = `${this.r2BaseUrl}/live/${sessionId}/${filename}`;
      
      try {
        const r2Response = await fetch(r2Url);
        
        if (r2Response.ok) {
          res.set({
            'Content-Type': 'video/mp2t',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          });
          
          r2Response.body.pipe(res);
        } else {
          // Fallback to Owncast if R2 doesn't have the chunk
          const owncastUrl = `${this.owncastUrl}/hls/${sessionId}/${filename}`;
          const owncastResponse = await fetch(owncastUrl);
          
          if (owncastResponse.ok) {
            res.set({
              'Content-Type': 'video/mp2t',
              'Cache-Control': 'public, max-age=300',
              'Access-Control-Allow-Origin': '*',
            });
            
            owncastResponse.body.pipe(res);
          } else {
            res.status(404).send('Chunk not found');
          }
        }
      } catch (error) {
        console.error('Error proxying chunk:', error);
        res.status(500).send('Error loading chunk');
      }
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = R2Proxy;
