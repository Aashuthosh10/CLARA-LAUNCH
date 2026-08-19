import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendModules = path.resolve(__dirname, '../frontend/node_modules');
const reactPkg = path.resolve(frontendModules, 'react');
const reactDomPkg = path.resolve(frontendModules, 'react-dom');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // node_modules is a junction to frontend — do NOT share Vite's optimize cache with :5176
    // or prebundles collide and yield duplicate React / invalid hook calls.
    cacheDir: path.resolve(__dirname, '.vite-facial'),
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: reactPkg,
        'react-dom': reactDomPkg,
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'motion/react'],
    },
    server: {
      port: 5177,
      strictPort: true,
      host: '0.0.0.0',
      fs: {
        allow: [__dirname, frontendModules, path.resolve(__dirname, '..')],
      },
    },
  };
});
