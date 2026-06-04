import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/export.ts'),
      fileName: 'export',
      formats: ['cjs']
    },
    rollupOptions: {
      external: ['fs', 'path', 'url']
    },
    target: 'node16'
  }
});
