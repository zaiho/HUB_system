import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          pdf: ['jspdf', 'jspdf-autotable'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    },
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true
  },
  preview: {
    port: 4173,
    host: true,
    strictPort: true
  }
});