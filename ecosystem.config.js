module.exports = {
  apps: [{
    name: 'rayonewholesale-api',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      PORT: 5555
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
