module.exports = {
  apps: [
    {
      name: 'owncast',
      cwd: '/home/ubuntu/owncast',
      script: './owncast',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ubuntu/.pm2/logs/owncast-error.log',
      out_file: '/home/ubuntu/.pm2/logs/owncast-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'broadcaster',
      cwd: '/home/ubuntu/webtorrent-livestream/broadcaster',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ubuntu/.pm2/logs/broadcaster-error.log',
      out_file: '/home/ubuntu/.pm2/logs/broadcaster-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'signaling',
      cwd: '/home/ubuntu/webtorrent-livestream/signaling',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/ubuntu/.pm2/logs/signaling-error.log',
      out_file: '/home/ubuntu/.pm2/logs/signaling-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

