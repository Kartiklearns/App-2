import { defineConfig } from 'vite';

export default defineConfig({
  base: '/App-2/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
