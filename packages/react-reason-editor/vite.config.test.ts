import * as fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import viteConfig from './vite.config';

describe('vite.config build.lib.entry', () => {
  it('only lists entry files that exist on disk', async () => {
    const config = await (viteConfig as any)({ mode: 'production', command: 'build' });
    const entries: string[] = config.build.lib.entry;

    expect(entries.length).toBeGreaterThan(0);

    const missing = entries.filter((entry) => !fs.existsSync(entry));
    expect(missing).toEqual([]);
  });

  it('does not turn a test file under an extension dir into a required entry', async () => {
    const config = await (viteConfig as any)({ mode: 'production', command: 'build' });
    const entries: string[] = config.build.lib.entry;

    // Zoom is a toolbar UI control with no top-level Zoom.ts Tiptap extension
    // file, only a components/RichTextZoom.test.ts test file. The entry
    // list must not require a nonexistent extensions/Zoom/Zoom.ts.
    expect(entries.some((entry) => entry.includes('extensions/Zoom/Zoom.ts'))).toBe(false);
  });
});
