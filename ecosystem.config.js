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
      JAMBONZ_ACCOUNT_SID: '740a6135-55ac-46d5-b14c-c87b95b71c9d',
      JAMBONZ_API_KEY: '3875184a-4b3f-45d4-a0c4-d4ac81426f26',
      JAMBONZ_REST_API_BASE_URL: 'https://jambonz.cloud/api/v1', // or replace with your own self-hosted jambonz URL
      RETELL_API_KEY: 'key_3c059fcc3f5ab307a4a896a86176',
      RETELL_AGENT_ID: ''
    }
  }]
};
