import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/api-proxy': 'http://localhost:5000',
      '/ws-proxy': { target: 'ws://localhost:5000', ws: true },
      '/ws-chat': { target: 'ws://localhost:5000', ws: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
