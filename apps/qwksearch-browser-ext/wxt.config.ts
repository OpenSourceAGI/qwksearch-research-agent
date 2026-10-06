import { defineConfig } from 'wxt';
import type { Plugin } from 'vite';
import path from 'path';
import { readdirSync, statSync } from 'fs';

// The LeoTabs tab organizer is a plain-JS extension kept as-is in
// leotabs/extension. Its pages (app.html, quick.html, parked.html, …), their ui/
// and lib/ modules, the switcher overlay and media are copied to the root of the
// build, where its own runtime.getURL('app.html') calls expect them. Its
// background.js is bundled into ours instead (entrypoints/background.ts), and its
// standalone manifest is replaced by the one below.
const LEOTABS_DIR = path.resolve(__dirname, 'leotabs/extension');
const LEOTABS_SKIP = new Set(['manifest.json', 'background.js', 'overlay-build.json']);

function leotabsFiles(dir = LEOTABS_DIR): { absoluteSrc: string; relativeDest: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const absoluteSrc = path.join(dir, name);
    const relativeDest = path.relative(LEOTABS_DIR, absoluteSrc).split(path.sep).join('/');
    if (dir === LEOTABS_DIR && LEOTABS_SKIP.has(name)) return [];
    return statSync(absoluteSrc).isDirectory() ? leotabsFiles(absoluteSrc) : [{ absoluteSrc, relativeDest }];
  });
}

// Chrome rejects content scripts with non-ASCII bytes.
// Vite's minifier converts \uXXXX escapes back to literal chars,
// so we post-process the content script bundle to re-escape them.
function escapeNonAsciiPlugin(): Plugin {
  return {
    name: 'escape-non-ascii-content-script',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.includes('content-scripts/') && chunk.type === 'chunk') {
          chunk.code = chunk.code.replace(
            /[^\x00-\x7F]/g,
            (ch) => `\\u${ch.codePointAt(0)!.toString(16).padStart(4, '0')}`
          );
        }
      }
    },
  };
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:publicAssets': (_wxt, files) => {
      files.push(...leotabsFiles());
    },
  },
  vite: () => ({
    plugins: [escapeNonAsciiPlugin()],
    build: {
      minify: false,
    },
    resolve: {
      // Exact-match regexes: a plain `'grab-url'` key also captures subpaths
      // such as `grab-url/animations`, which then resolve *inside* the shim file.
      alias: [
        // Shim next/navigation so research-agent-ui compiles outside Next.js
        { find: /^next\/navigation$/, replacement: path.resolve(__dirname, 'lib/next-navigation-shim.tsx') },
        // Shim grab-url to rewrite relative /api/* paths to the production host
        { find: /^grab-url$/, replacement: path.resolve(__dirname, 'lib/grab-url-shim.ts') },
      ],
    },
  }),
  manifest: (env) => ({
    name: 'QwkSearch Tab Manager AI',
    version: '6.1.0',
    action: {
      default_title: 'QwkSearch',
      default_icon: { 16: 'icon/16.png', 32: 'icon/32.png' },
    },
    permissions: [
      'sidePanel',
      'scripting',
      'contextMenus',
      'tabs',
      'favicon',
      'activeTab',
      'webRequest',
      'declarativeNetRequest',
      'offscreen',
      'sessions',
      'downloads',
      'downloads.open',
      'history',
      'bookmarks',
      // LeoTabs: native tab groups, its IndexedDB library, and the periodic
      // session checkpoint that survives service-worker suspension.
      'tabGroups',
      'storage',
      'unlimitedStorage',
      'alarms',
    ],
    host_permissions: ['<all_urls>'],
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Q',
          mac: 'Command+B',
        },
        description: 'Open side panel',
      },
      // LeoTabs. Chrome allows four suggested shortcuts per extension; these
      // and _execute_action are the four.
      'open-switcher': {
        suggested_key: { default: 'Alt+Q' },
        description: 'Toggle visual tab switcher',
      },
      'open-library': {
        suggested_key: { default: 'Alt+Shift+Q' },
        description: 'Open the tab organizer library',
      },
      'open-search': {
        suggested_key: { default: 'Alt+Shift+K' },
        description: 'Search tabs, @collections and /commands',
      },
    },
    // LeoTabs: type "tabs" and a space in the address bar to search tabs and collections.
    omnibox: { keyword: 'tabs' },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    web_accessible_resources: [
      {
        resources: ['_favicon/*'],
        matches: ['<all_urls>'],
      },
    ],
    // homepage/startup_pages/search_provider aren't part of Firefox's
    // supported chrome_settings_overrides subset, so only offer this on Chrome.
    ...(env.browser === 'chrome'
      ? {
          chrome_settings_overrides: {
            homepage: 'https://qwksearch.com',
            startup_pages: ['https://qwksearch.com'],
            search_provider: {
              name: 'QwkSearch',
              keyword: 'qwk',
              search_url: 'https://qwksearch.com?q={searchTerms}',
              favicon_url: 'https://qwksearch.com/favicon.ico',
              encoding: 'UTF-8',
              is_default: true,
            },
          },
        }
      : {}),
  }),
});
