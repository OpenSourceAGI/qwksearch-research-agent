#!/usr/bin/env node
/**
 * Build every `packages/*` that has a `build` script, in dependency order.
 *
 * `apps/qwksearch-web` consumes its siblings through their built `dist/`, and
 * its `prebuild` used to name them in a hand-written `cd ... && bun run build`
 * chain. That chain listed `research-agent-ui` *before* `reason-editor` and
 * `reason-editor-sidebar`, two packages whose types it imports, so its
 * declaration build could not resolve them:
 *
 *   src/workspace/ResearchWorkspaceView.tsx: Cannot find module
 *   'react-reason-editor/reason-docs' or its corresponding type declarations.
 *
 * `bun install` links siblings into node_modules as symlinks, so one that has
 * not been built yet has no `dist/` and its `exports` -> `types` entries point
 * at files that do not exist. The npm publish workflow hit the same wall and
 * fixed it with `workspace-build-order.mjs` (see #386); this reuses that same
 * topological order rather than keeping a second hand-maintained list in sync.
 *
 * Turbo would also order these correctly from `turbo.json`'s
 * `dependsOn: ["^build"]`, but its graph counts a dependency as internal only
 * when the declared range matches the workspace copy. `research-agent-ui` asks
 * for `use-voice-control: ^0.1.95` while the workspace sits at 0.1.93, so
 * turbo treats it as an ordinary registry dependency and never builds it.
 * `workspaceBuildOrder` keys local edges by package *name*, which is why it
 * covers that case and turbo does not.
 *
 * Usage: node .github/scripts/build-workspace-packages.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { workspaceBuildOrder } from './workspace-build-order.mjs';

/** Repository root, one level up from `scripts/`. */
export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The subset of {@link workspaceBuildOrder} that defines a `build` script,
 * in the same order. Packages without one (e.g. `qwksearch-api-client`, whose
 * `dist` is committed) are skipped rather than failing the run.
 *
 * @param {string} root
 * @returns {string[]} directories relative to the repository root
 */
export function buildablePackages(root = 'packages') {
  return workspaceBuildOrder(path.join(repoRoot, root)).map((dir) => path.join(root, path.basename(path.normalize(dir)))).filter((dir) => {
    const manifest = path.join(repoRoot, dir, 'package.json');
    if (!fs.existsSync(manifest)) return false;

    return Boolean(JSON.parse(fs.readFileSync(manifest, 'utf8')).scripts?.build);
  });
}

function main() {
  const dirs = buildablePackages();

  console.log(`Building ${dirs.length} workspace packages in dependency order:`);
  for (const dir of dirs) console.log(`   ${dir}`);

  for (const dir of dirs) {
    console.log(`\n▶ ${dir}`);
    const result = spawnSync('bun', ['run', 'build'], {
      cwd: path.join(repoRoot, dir),
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      console.error(`\n✗ ${dir} failed with exit code ${result.status}`);
      process.exit(result.status ?? 1);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
