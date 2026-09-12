import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildablePackages, repoRoot } from '../build-workspace-packages.mjs';

const order = buildablePackages();

/** Position of a package directory in the build order, or -1. */
function at(name) {
  return order.indexOf(path.join('packages', name));
}

describe('buildablePackages', () => {
  it('only lists packages that define a build script', () => {
    for (const dir of order) {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, dir, 'package.json'), 'utf8'));

      expect(pkg.scripts?.build, dir).toBeTruthy();
    }
  });

  it('skips packages without one', () => {
    // `qwksearch-api-client` ships a committed `dist` and has no `build`
    // script; naming it in a build chain would fail the run.
    expect(at('qwksearch-api-client')).toBe(-1);
  });

  it('builds research-agent-ui after every sibling whose types it imports', () => {
    // The hand-written prebuild chain this replaced put research-agent-ui
    // before the two editor packages, so its declaration build could not
    // resolve `react-reason-editor/*` or `react-reason-editor-sidebar`.
    const ui = at('research-agent-ui');
    expect(ui).toBeGreaterThan(-1);

    for (const dependency of ['reason-editor', 'reason-editor-sidebar', 'chat-agent-toolkit']) {
      expect(at(dependency), dependency).toBeGreaterThan(-1);
      expect(at(dependency), dependency).toBeLessThan(ui);
    }
  });

  it('includes use-voice-control, which turbo skips', () => {
    // research-agent-ui asks for `^0.1.95` while the workspace copy is 0.1.93,
    // so turbo does not count it as an internal dependency. The build order is
    // keyed by package name, so it does.
    expect(at('use-voice-control')).toBeGreaterThan(-1);
    expect(at('use-voice-control')).toBeLessThan(at('research-agent-ui'));
  });
});
