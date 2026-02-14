const { defineConfig } = require('cypress')

module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'https://plugins.test',
    setupNodeEvents(on, config) {
      const baseUrl = config.env.baseUrl || null;

      if (baseUrl) {
        config.baseUrl = baseUrl;
      }

      return config;
    },
  },
})
