import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read package.json for external dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Check which entry we're building: the CLI, the React modal, or the main library
const buildCli = process.env.BUILD_CLI === 'true';
const buildReact = process.env.BUILD_REACT === 'true';

const libEntry = buildCli
  ? {
      entry: resolve(__dirname, 'src/cli.ts'),
      name: 'ExtractYoutubeCli',
      formats: ['cjs'] as const,
      fileName: () => 'cli.js',
    }
  : buildReact
    ? {
        entry: resolve(__dirname, 'src/react/index.ts'),
        name: 'ExtractYoutubeReact',
        formats: ['es', 'cjs'] as const,
        fileName: (format: string) => `react/index.${format === 'es' ? 'mjs' : 'cjs'}`,
      }
    : {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'YouTubeTranscriptApi',
        formats: ['es', 'cjs'] as const,
        fileName: (format: string) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      };

export default defineConfig({
  build: {
    // Never let vite empty the output dir itself — the three lib/cli/react
    // builds and the tsc declaration build all write into the same `dist/`,
    // and each would wipe out the others' output. `npm run build` cleans
    // `dist/` once up front instead (see package.json's `clean` script).
    emptyOutDir: false,
    lib: libEntry,
    rollupOptions: {
      // Externalize dependencies to avoid bundling them.
      // grab-url is deliberately bundled: its published CJS entry resolves
      // its internal chunks relative to the consumer's cwd and fails to load
      // under require(); bundling its ESM source avoids the broken entry.
      external: buildReact
        ? ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react']
        : [
            ...Object.keys(pkg.dependencies || {}).filter((d) => d !== 'grab-url'),
            'node:http',
            'node:https',
            'node:url',
            'node:stream',
            'node:buffer',
            'node:util',
          ],
      output: {
        // Preserve module structure for better tree-shaking
        preserveModules: false,
        exports: 'named',
        // Provide global names for UMD/IIFE builds
        globals: buildReact
          ? { react: 'React', 'react-dom': 'ReactDOM', 'lucide-react': 'LucideReact' }
          : {
              'grab-url': 'grab',
              'fast-xml-parser': 'XMLParser',
              'html-entities': 'htmlEntities',
              'https-proxy-agent': 'HttpsProxyAgent',
            },
      },
    },
    minify: buildCli ? false : 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // Generate source maps for debugging
    sourcemap: true,
    // Target modern environments
    target: 'es2020',
    // Emit declaration files
    emitAssets: true,
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
});
