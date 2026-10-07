import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/index.ts'],
  format: ['esm', 'cjs'],
  // Declarations come from `tsc -p tsconfig.build.json` (see the build
  // script), as in trending-news-api: tsup's bundled dts plugin is built
  // against TypeScript 5 and throws on the TypeScript 7 this repo installs.
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['react', 'react-dom'],
});
