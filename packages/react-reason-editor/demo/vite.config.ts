/**
 * Vite configuration for the demo site, including React and Tailwind setup and aliasing to the local library source. Wires the demo to build directly against the in-repo editor code.
 */

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const srcDir = resolve(__dirname, '../src')

function stripTailwindDirectives(code: string): string {
  return code.replace(/@(?:tailwind|config|reference)[^\n]*\n?/g, '')
}

// Resolve react-reason-editor sub-package imports to local source.
// Package paths are lowercase (e.g. react-reason-editor/bold) but
// extension directories are PascalCase (e.g. src/extensions/Bold/).
// Only style.css resolves to dist: it is the compiled stylesheet produced
// by `pnpm build:lib`, which must run before the demo.
function reasonEditorResolver(): Plugin {
  const extDir = resolve(srcDir, 'extensions')
  const distStylePath = resolve(__dirname, '../dist/style.css')
  // Map lowercase package subpaths to PascalCase extension dirs
  // (e.g. bulletlist -> BulletList). First-letter capitalization alone
  // misses multi-word names, which would fall through to the package
  // self-reference and load prebuilt dist files instead of src.
  const extDirByLowerName = new Map<string, string>()
  for (const dir of fs.readdirSync(extDir)) {
    extDirByLowerName.set(dir.toLowerCase(), dir)
  }
  return {
    name: 'reason-editor-resolver',
    // Must run before vite:resolve, which otherwise resolves
    // react-reason-editor imports through the package self-reference
    // (root package.json `exports`) straight into prebuilt dist files.
    enforce: 'pre',
    resolveId(id) {
      if (id === 'react-reason-editor') return resolve(srcDir, 'index.ts')
      if (id === 'react-reason-editor/style.css') return distStylePath
      if (id === 'react-reason-editor/theme') return resolve(srcDir, 'theme/theme.ts')
      if (id === 'react-reason-editor/locale-bundle') return resolve(srcDir, 'locale-bundle.ts')
      if (id === 'react-reason-editor/bubble') return resolve(srcDir, 'bubble.ts')
      const m = id.match(/^react-reason-editor\/(.+)$/)
      if (!m) return
      const name = m[1]
      const variants = [
        extDirByLowerName.get(name.toLowerCase()),
        name.charAt(0).toUpperCase() + name.slice(1),
        name,
      ].filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i)
      for (const v of variants) {
        const idx = resolve(extDir, v, 'index.ts')
        if (fs.existsSync(idx)) return idx
        const file = resolve(extDir, v, `${v}.ts`)
        if (fs.existsSync(file)) return file
      }
    },
    load(id) {
      try {
        if (resolve(id.split('?')[0]) === distStylePath) {
          const code = fs.readFileSync(distStylePath, 'utf8')
          const stripped = stripTailwindDirectives(code)
          return `@config "../tailwind.config.js";\n@plugin "tailwindcss-animate";\n@reference "tailwindcss";\n${stripped}`
        }
      } catch {}
    },
    buildStart() {
      try {
        if (fs.existsSync(distStylePath)) {
          const code = fs.readFileSync(distStylePath, 'utf8')
          const stripped = stripTailwindDirectives(code)
          const out = `@config "../tailwind.config.js";\n@plugin "tailwindcss-animate";\n@reference "tailwindcss";\n${stripped}`
          fs.writeFileSync(distStylePath, out, 'utf8')
        }
      } catch {}
    },
    // Load tailwind.config.js via @config so Tailwind v4 recognises the
    // richtext- prefix, then @reference to allow @apply richtext-* resolution
    // without injecting Tailwind utilities into the output.
    // Also strips v3 @tailwind directives which are not valid in v4.
    transform(code, id) {
      if (resolve(id.split('?')[0]) === distStylePath) {
        const stripped = stripTailwindDirectives(code)
        return { code: `@config "../tailwind.config.js";\n@plugin "tailwindcss-animate";\n@reference "tailwindcss";\n${stripped}`, map: null }
      }
    },
  }
}

export default defineConfig({
  root: __dirname,
  server: {
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**'],
    },
  },
  plugins: [reasonEditorResolver(), tailwindcss(), react()],
  resolve: {
    alias: [
      { find: '@', replacement: srcDir },
    ],
  },
  css: {
    postcss: resolve(__dirname, '.'),
    preprocessorOptions: {
      scss: {
        charset: false,
        api: 'modern-compiler',
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    outDir: resolve(__dirname, '../dist/demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        alternatives: resolve(__dirname, 'alternatives.html'),
      },
    },
  },
})
