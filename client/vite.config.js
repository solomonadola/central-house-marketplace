import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${env.API_PORT || 3000}`,
          secure: false,
        },
      },
    },

    plugins: [react()],

    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      // Real values aren't needed in tests; firebase.js only reads the key.
      env: { VITE_FIREBASE_API_KEY: 'test-key' },
    },
  };
});
