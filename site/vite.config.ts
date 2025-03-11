import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/survey': {
        target: 'https://alphabetizi.ng',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`Proxying ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(
              `Received ${proxyRes.statusCode} for ${req.method} ${req.url}`,
            );
          });
        },
      },
    },
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      preflightContinue: false,
    },
  },
});
