import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import viteConfigFn from '../vite.config';

/**
 * Guards the two build settings that keep this library loadable on a server.
 *
 * Vite builds a library with the *browser* export conditions, so a dependency
 * that ships a DOM-only build behind `browser` gets that build inlined into
 * `dist/` — frozen there for every consumer, whatever conditions they resolve
 * with. If that build touches `document` at module scope, merely *loading* the
 * chunk throws `ReferenceError: document is not defined`, and an app
 * server-rendering a route that mounts the editor answers the whole request
 * with an error page rather than a boundary (this is what made qwksearch.com's
 * homepage, which mounts the research workspace, serve a 500).
 *
 * Two dependencies do exactly that today, and each is handled a different way:
 * `react-textarea-autosize` is a declared dependency, so it is left external
 * for the host to resolve per environment; `decode-named-character-reference`
 * is transitive, so it is bundled but resolved under Node's conditions.
 */
async function resolveBuildConfig() {
  return viteConfigFn({ command: 'build', mode: 'production', isSsrBuild: false, isPreview: false });
}

describe('SSR-unsafe dependencies are kept out of the bundle', () => {
  it('leaves react-textarea-autosize external', async () => {
    const config = await resolveBuildConfig();

    // Its `browser` build opens with a top-level
    // `!!document.documentElement.currentStyle`; its `workerd` / `worker` /
    // `edge-light` builds guard that behind an `isBrowser` check. External, the
    // host bundler picks whichever suits the environment it is building for.
    expect(config.build?.rollupOptions?.external).toContain('react-textarea-autosize');
  });
});

describe('nodeConditionResolver', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reason-editor-conditions-'));
  const packageDir = path.join(fixtureRoot, 'node_modules', 'decode-named-character-reference');
  const importer = path.join(fixtureRoot, 'importer.js');

  // A stand-in for the real package, carrying the same shape that matters: a
  // DOM-only entry behind the `browser` condition and a neutral `default` one.
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({
      name: 'decode-named-character-reference',
      version: '1.3.0',
      type: 'module',
      main: 'index.js',
      exports: { browser: './index.dom.js', default: './index.js' },
    }),
  );
  fs.writeFileSync(path.join(packageDir, 'index.js'), 'export default {};\n');
  fs.writeFileSync(path.join(packageDir, 'index.dom.js'), 'export default {};\n');
  fs.writeFileSync(importer, 'export default {};\n');

  afterAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  async function getPlugin() {
    const config = await resolveBuildConfig();
    const plugins = (config.plugins ?? []).flat(Infinity) as { name?: string }[];
    const plugin = plugins.find((p) => p?.name === 'reason-editor-node-condition-resolve');

    expect(plugin, 'the node-condition resolver must stay in the plugin list').toBeDefined();

    return plugin as { resolveId: (id: string, importer?: string) => string | null };
  }

  it('redirects a listed dependency to its non-DOM entry', async () => {
    const plugin = await getPlugin();

    const resolved = plugin.resolveId('decode-named-character-reference', importer);

    expect(resolved).toBe(path.join(packageDir, 'index.js'));
  });

  it('leaves every other specifier to Vite', async () => {
    const plugin = await getPlugin();

    expect(plugin.resolveId('react', importer)).toBeNull();
    // An entry point has no importer to resolve from.
    expect(plugin.resolveId('decode-named-character-reference', undefined)).toBeNull();
  });

  it('falls through when the dependency is not reachable from the importer', async () => {
    const plugin = await getPlugin();

    expect(plugin.resolveId('decode-named-character-reference', os.tmpdir() + '/nowhere.js')).toBeNull();
  });
});
