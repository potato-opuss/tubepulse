import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base keeps asset URLs working inside the Capacitor WebView.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
