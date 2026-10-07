import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/index.ts'],
  format: ['esm', 'cjs'],
  // Declarations come from `tsc -p tsconfig.build.json` (see the build
  // script): tsup's bundled rollup-plugin-dts is built against TypeScript 5
  // and throws on the TypeScript 7 this repo installs.
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['react', 'react-dom'],
  // The stylesheet is shipped as a plain file rather than imported from a
  // component, so a host app that brings its own styling never pays for it.
  onSuccess: 'cp src/styles.css dist/styles.css',
});
