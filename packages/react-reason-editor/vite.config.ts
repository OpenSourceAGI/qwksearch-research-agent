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
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const isDev = mode !== 'production';

  const entry = [
    path.resolve(__dirname, 'src/index.ts'),
    path.resolve(__dirname, 'src/locale-bundle.ts'),
    path.resolve(__dirname, 'src/bubble.ts'),
    path.resolve(__dirname, 'src/theme/theme.ts'),
    path.resolve(__dirname, 'src/reason-docs.ts'),
  ];

  const files = await globbySync('src/extensions/**/*.ts', {
    ignore: ['src/**/*/index.ts', 'src/**/*.spec.ts'], // Exclude .spec.ts files
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
    plugins: [react(), dts({
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
          'react',
          'react-dom',
          'react/jsx-runtime',
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
        ],
      },
    },
  };
});
