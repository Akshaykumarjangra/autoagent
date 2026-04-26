// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'autonomix-backend',
      cwd: './backend',
      script: 'server.js',
      node_args: '--env-file=.env.local',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        API_BACKEND_HOST: '0.0.0.0',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
