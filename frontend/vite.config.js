import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cache-Control — 전역 CLAUDE.md 규칙
const noCacheHeaders = { 'Cache-Control': 'public, max-age=0, must-revalidate' };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: noCacheHeaders,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
  preview: {
    port: 5173,
    headers: noCacheHeaders,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
});
