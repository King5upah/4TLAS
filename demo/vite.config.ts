import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/sc-atlas/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
});
