import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (
            normalizedId.includes('node_modules/react/') ||
            normalizedId.includes('node_modules/react-dom/') ||
            normalizedId.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (
            normalizedId.includes('node_modules/motion') ||
            normalizedId.includes('node_modules/framer-motion')
          ) {
            return 'vendor-motion';
          }
          if (normalizedId.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (normalizedId.includes('/src/lib/generators/')) {
            return 'math-generators';
          }
        },
      },
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
