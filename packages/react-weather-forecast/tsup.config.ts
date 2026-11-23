import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // Declarations come from `tsc -p tsconfig.build.json` (see the build
  // script). tsup bundles rollup-plugin-dts built against TypeScript 5,
  // which throws `Cannot read properties of undefined (reading
  // 'useCaseSensitiveFileNames')` on the TypeScript 7 this repo installs.
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['react', 'react-dom', 'grab-url', 'suncalc'],
});
