module.exports = {
  apps : [{
    name: 'retellai-shim',
    script: 'app.js',
    instance_var: 'INSTANCE_ID',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LOGLEVEL: 'info',
      HTTP_PORT: 3000,
      JAMBONZ_ACCOUNT_SID: '',
      JAMBONZ_API_KEY: '',
      JAMBONZ_REST_API_BASE_URL: 'https://jambonz.cloud/api/v1', // or replace with your own self-hosted jambonz URL
      RETELL_API_KEY: '',
      RETELL_AGENT_ID: ''
    }
  }]
};
