import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Single source of truth for college facts: en.json, hi.json, kn.json, ta.json, te.json, ml.json
        '@college-locales': path.resolve(__dirname, '../backend/data/locales'),
      },
    },
    server: {
      port: 5176,
      strictPort: true,
      host: '0.0.0.0',
      fs: {
        allow: ['..']
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
