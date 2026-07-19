import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
// import { heyApiPlugin } from '@hey-api/vite-plugin';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: true,
      mangle: true,
      format: {
        comments: false
      }
    },
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'umd'],
      fileName: 'api-client',
      name: 'api-client'
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {

    }
  },
  plugins: [
    // heyApiPlugin is disabled during build since we run openapi-ts separately
    // heyApiPlugin({
    //   config: {
    //     input: './qwksearch-openapi.yml',
    //     output: './src'
    //   }
    // }),
    dts({
      outDir: 'dist',
      rollupTypes: true,
      include: ['src']
    })
  ]
});
