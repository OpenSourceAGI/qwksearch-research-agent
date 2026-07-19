import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'DomainRank',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['fs', 'fs/promises', 'path', 'url']
    },
    target: 'node16',
    minify: false,
    sourcemap: true
  }
});
