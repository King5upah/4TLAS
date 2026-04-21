import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/4TLAS/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
});
