import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Lawn-Defense-Force/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
