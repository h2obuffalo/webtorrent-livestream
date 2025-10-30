module.exports = {
  apps: [
    {
      name: 'owncast',
      script: '/usr/local/bin/owncast',
      cwd: '/home/ubuntu/webtorrent-livestream',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'signaling',
      script: 'signaling/server.js',
      cwd: '/home/ubuntu/webtorrent-livestream',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'broadcaster',
      script: 'broadcaster/server.js',
      cwd: '/home/ubuntu/webtorrent-livestream',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'tunnel',
      script: 'cloudflared',
      args: 'tunnel --config /home/ubuntu/.cloudflared/config.yml run',
      cwd: '/home/ubuntu/webtorrent-livestream',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'viewer',
      script: 'viewer/server.js',
      cwd: '/home/ubuntu/webtorrent-livestream',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};