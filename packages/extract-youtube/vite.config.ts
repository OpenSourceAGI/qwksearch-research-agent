import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read package.json for external dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Check if we're building the CLI or the library
const buildCli = process.env.BUILD_CLI === 'true';

export default defineConfig({
  build: {
    // Don't empty output dir for CLI build to preserve library files
    emptyOutDir: !buildCli,
    lib: buildCli ? {
      entry: resolve(__dirname, 'src/cli.ts'),
      name: 'ExtractYoutubeCli',
      formats: ['cjs'],
      fileName: () => 'cli.js',
    } : {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YouTubeTranscriptApi',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // Externalize dependencies to avoid bundling them.
      // grab-url is deliberately bundled: its published CJS entry resolves
      // its internal chunks relative to the consumer's cwd and fails to load
      // under require(); bundling its ESM source avoids the broken entry.
      external: [
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
        globals: {
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
