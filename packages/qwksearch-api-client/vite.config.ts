import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// The generated SDK sends its requests through api2client (a Hey API client
// backed by grab) rather than fetch, so both it and grab itself stay external:
// bundling them would give this package a private grab instance, and grab's
// cache, dedupe, rate limiting and `grab.mock` registry are per-instance. A
// consumer that also uses grab has to be looking at the same one.
const external = ['api2client', 'grab-url'];

// UMD needs a browser-global name for each external. Nothing exposes these as
// globals today — the CJS path `require()`s them — but naming them keeps the
// UMD output valid instead of emitting `undefined`.
const globals = {
  'api2client': 'api2client',
  'grab-url': 'grab',
};

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
      external,
      output: { globals }
    }
  },
  plugins: [
    dts({
      outDir: 'dist',
      // vite-plugin-dts 5 delegates to unplugin-dts, which spells this
      // `bundleTypes`. The old `rollupTypes` name is silently ignored, so the
      // build emitted per-file types under dist/src/ while package.json
      // advertised a single dist/index.d.ts — hence consumers having to
      // `declare module 'qwksearch-api-client'` to get past TS7016.
      bundleTypes: true,
      include: ['src']
    })
  ]
});
