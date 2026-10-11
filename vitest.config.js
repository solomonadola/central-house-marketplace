import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api/**/*.test.js'],
    environment: 'node',
    globalSetup: ['api/test/globalSetup.js'],
    setupFiles: ['api/test/setup.js'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      AUTH_RATE_LIMIT: '1000',
      VIEW_RATE_LIMIT: '1000',
      MESSAGE_RATE_LIMIT: '1000',
      EMAIL_RATE_LIMIT: '1000',
      // Never call the real geocoding service from tests.
      GEOCODING: 'off',
    },
    // Starting the in-memory MongoDB binary can be slow on first run.
    hookTimeout: 60000,
  },
});
