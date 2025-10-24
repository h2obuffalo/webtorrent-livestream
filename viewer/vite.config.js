import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // Allow external access (for Cloudflare tunnel)
    strictPort: true,
    open: false, // Don't auto-open (we'll use tunnel URL)
    allowedHosts: ['.danpage.uk'], // Allow Cloudflare tunnel domain
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  publicDir: 'public',
});

