const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9600',
    supportFile: false,
    specPattern: 'cypress/integration/**/*.cy.{js,jsx,ts,tsx}',
    testIsolation: false,
  },
});
