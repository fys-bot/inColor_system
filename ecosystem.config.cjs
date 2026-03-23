module.exports = {
  apps: [{
    name: 'incolor-admin',
    script: 'server/index.js',
    cwd: '/root/incolor-admin',
    env: {
      NODE_ENV: 'production',
    },
    // 日志
    error_file: '/root/incolor-admin/logs/error.log',
    out_file: '/root/incolor-admin/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 自动重启
    max_restarts: 10,
    restart_delay: 3000,
    watch: false,
  }]
};
