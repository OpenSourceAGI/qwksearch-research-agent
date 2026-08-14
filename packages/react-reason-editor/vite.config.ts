import * as fs from 'node:fs';
import * as path from 'node:path';

import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import { globbySync } from 'globby';
import postcssReplace from 'postcss-replace';
// The library styles are authored for Tailwind v3 semantics: a dashed
// `richtext-` prefix in class names and `@tailwind`/`@apply` directives in
// the SCSS. Tailwind v4 rejects dashed prefixes, so the lib CSS is compiled
// with v3 (aliased as `tailwindcss3`) while apps consuming the lib are free
// to use v4 for their own styles.
import tailwindcss3 from 'tailwindcss3';
import dts from 'unplugin-dts/vite';
import { defineConfig, type Plugin } from 'vite';

// A few internal modules (e.g. src/editor/TiptapEditorWrapper.tsx) import
// the package by its own published name — the self-reference Node resolves
// once consumers install this package for real. During this library's own
// build there is no such install yet, so point those specifiers straight at
// their source equivalents (mirrors demo/vite.config.ts's resolver, which
// does the same for the demo build).
//
// Extension subpaths (e.g. react-reason-editor/wordcount) are handled
// generically rather than as a fixed list: without this, an unresolved
// subpath falls through to Node's own self-reference algorithm, which
// points at the not-yet-written dist/*.js chunk for that entry. Whether
// that resolves depends on Rolldown's (non-deterministic) transform order
// relative to when the target entry's own chunk gets emitted, so the build
// would pass or fail from run to run.
function selfReferenceResolver(srcDir: string): Plugin {
  const extDir = path.resolve(srcDir, 'extensions');
  // Map lowercase package subpaths to PascalCase extension dirs
  // (e.g. bulletlist -> BulletList). First-letter capitalization alone
  // misses multi-word names, which would fall through to the package
  // self-reference and race the not-yet-built dist output.
  const extDirByLowerName = new Map<string, string>();
  for (const dir of fs.readdirSync(extDir)) {
    extDirByLowerName.set(dir.toLowerCase(), dir);
  }

  return {
    name: 'reason-editor-self-reference',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'react-reason-editor') return path.resolve(srcDir, 'index.ts');
      if (id === 'react-reason-editor/style.css') return path.resolve(srcDir, 'styles/index.scss');
      if (id === 'react-reason-editor/theme') return path.resolve(srcDir, 'theme/theme.ts');
      if (id === 'react-reason-editor/locale-bundle') return path.resolve(srcDir, 'locale-bundle.ts');
      // Rolldown fails to resolve this one extension subpath as a
      // cross-entry self-reference (unlike every other `./extensions/*`
      // export, which it resolves natively during this build), so it needs
      // the same explicit source redirect as the paths above.
      if (id === 'react-reason-editor/wordcount') return path.resolve(srcDir, 'extensions/WordCount/index.ts');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const isDev = mode !== 'production';
  const srcDir = path.resolve(__dirname, 'src');

  const entry = [
    path.resolve(__dirname, 'src/index.ts'),
    path.resolve(__dirname, 'src/locale-bundle.ts'),
    path.resolve(__dirname, 'src/bubble.ts'),
    path.resolve(__dirname, 'src/theme/theme.ts'),
    path.resolve(__dirname, 'src/reason-docs.ts'),
  ];

  // Only the extension directory name is read off each match, so any stray
  // .ts anywhere under an extension is enough to declare an entry at
  // src/extensions/<Name>/<Name>.ts. Colocated tests must therefore be
  // ignored alongside index.ts: a test file in a component-only extension
  // (Subscript, Superscript) would otherwise demand an entry module that
  // does not exist and fail the build with UNRESOLVED_ENTRY.
  const files = await globbySync('src/extensions/**/*.ts', {
    ignore: ['src/**/*/index.ts', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
  });

  const exports = {};
  const typeVersions = {};

  files.forEach((v: any) => {
    const vv = v.replace('src/', '');
    const [, _name] = vv.split('/');

    if (_name) {
      entry.push(path.resolve(__dirname, `src/extensions/${_name}/${_name}.ts`));

      exports[`./${_name.toLowerCase()}`] = {
        require: {
          types: `./lib/extensions/${_name}/index.d.ts`,
          default: `./lib/${_name}.cjs`,
        },
        import: {
          types: `./lib/extensions/${_name}/index.d.ts`,
          default: `./lib/${_name}.js`,
        },
      };
      typeVersions[`./${_name.toLowerCase()}`] = [`./lib/extensions/${_name}/index.d.ts`];
    }
  });

  // const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
  // packageJson.exports = {
  //   ...packageJson.exports,
  //   ...exports,
  // }
  // packageJson.typesVersions = {
  //   "*": {
  //     ...packageJson.typesVersions["*"],
  //     ...typeVersions,
  //   }
  // }
  // fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))

  return {
    plugins: [selfReferenceResolver(srcDir), react(), dts({
      // Pin the declaration source root to src/ so declarations emit directly
      // under dist/ (e.g. dist/extensions/Bold/index.d.ts) matching the
      // package.json export/type paths, with no post-build hoist step.
      entryRoot: path.resolve(__dirname, 'src'),
      exclude: ['src/editor-views/**'],
      compilerOptions: {
        rootDir: path.resolve(__dirname, 'src'),
        skipLibCheck: true,
        skipDefaultLibCheck: true,
      },
    })],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss3({ config: path.resolve(__dirname, 'tailwind.config.js') }),
          autoprefixer(),
          postcssReplace({
            pattern: /(--tw|\*, ::before, ::after)/g,
            data: {
              '--tw': '--richtext', // Prefixing
              '*, ::before, ::after': ':root', // So variables does not pollute every element
            },
          }),
        ],
      },
      preprocessorOptions: {
        scss: {
          charset: false,
          api: 'modern-compiler', // or 'modern'
        },
      },
    },
    build: {
      cssMinify: 'esbuild',
      minify: 'terser',
      outDir: 'dist',
      sourcemap: isDev,
      terserOptions: {
        compress: {
          drop_console: !isDev,
          drop_debugger: !isDev,
          pure_funcs: !isDev ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : [],
        },
        format: {
          comments: false,
        },
      },
      lib: {
        entry,
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => {
          if (format === 'es') return `${entryName}.js`;

          return `${entryName}.cjs`;
        },
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name == 'react-reason-editor.css') return 'style.css';
            return assetInfo.name;
          },
        },
        external: [
          '@tiptap/pm/model',
          '@tiptap/pm/state',
          '@tiptap/pm/view',
          // @tiptap/react pulls in use-sync-external-store's CJS shim. Bundled
          // in (rather than externalized), Rolldown's CJS interop for it falls
          // back to a runtime `require("react")`, which crashes under strict
          // Node ESM — e.g. Next.js SSR — where no `require` global exists.
          '@tiptap/react',
          'react',
          'react-dom',
          'react/jsx-runtime',
          // Pulled in transitively (e.g. by swr, and vendored into grab-url's
          // own dist). Its shim does a NODE_ENV-conditional `require(...)`,
          // which Rollup can't resolve to a single static import — bundling
          // it produces a "dynamic require" call that has no `require` to
          // run against in an ESM output. Left external, host bundlers
          // (Next.js/webpack) resolve the real CJS package and its
          // conditional require normally.
          'use-sync-external-store',
          'use-sync-external-store/shim',
          'use-sync-external-store/shim/index.js',
          'use-sync-external-store/shim/with-selector',
          'use-sync-external-store/shim/with-selector.js',
          'use-sync-external-store/with-selector',
          // grab-url's own published dist already vendors the
          // use-sync-external-store shim above (same dynamic-require issue),
          // so it must stay external too rather than get re-bundled here.
          'grab-url',
          'katex',
          'docx',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-icons',
          '@radix-ui/react-label',
          '@radix-ui/react-popover',
          '@radix-ui/react-separator',
          '@radix-ui/react-slot',
          '@radix-ui/react-switch',
          '@radix-ui/react-tabs',
          '@radix-ui/react-toast',
          '@radix-ui/react-toggle',
          '@radix-ui/react-tooltip',
          '@radix-ui/react-select',
          '@radix-ui/react-checkbox',
          'react-colorful',
          'scroll-into-view-if-needed',
          'lucide-react',
          'prosemirror-docx',
          're-resizable',
          '@radix-ui/react-dialog',
          'react-image-crop',
          'mermaid',
          'easydrawer',
          'frimousse',
          'lowlight',
          'clsx',
          'harper.js',
          'harper.js/binary',
          // Pulls in swr, which shares the same use-sync-external-store CJS
          // shim problem as @tiptap/react above.
          'react-tweet',
        ],
      },
    },
  };
});
