/**
 * Creates a Harper-based linter that produces grammar and spelling suggestions. Supplies the diagnostics the Harper extension renders in the editor.
 */

import type { Dialect, Linter } from 'harper.js';

export type HarperDialect = 'American' | 'British' | 'Australian' | 'Canadian' | 'Indian';

export interface CreateHarperLinterOptions {
  /**
   * Prefer a dedicated web worker so linting large documents does not block
   * the editor thread. Falls back to a main-thread linter when workers are
   * unavailable or fail to start. Defaults to `true`.
   */
  preferWorker?: boolean;
  /** English dialect Harper should lint against. Defaults to `American`. */
  dialect?: HarperDialect;
}

/**
 * Client-safe Harper linter bootstrap.
 *
 * `harper.js` ships as browser-friendly ESM backed by WebAssembly, so it must
 * only be initialized in the browser. Everything is loaded through dynamic
 * `import()` to keep it out of any server bundle and off the initial critical
 * path.
 */
export async function createHarperLinter(
  options: CreateHarperLinterOptions = {}
): Promise<Linter> {
  if (typeof window === 'undefined') {
    throw new Error('Harper linter can only be created in a browser environment.');
  }

  const { preferWorker = true, dialect = 'American' } = options;

  const harper = await import('harper.js');
  const { binary } = await import('harper.js/binary');

  const dialectValue: Dialect = harper.Dialect[dialect];
  const init = { binary, dialect: dialectValue };

  const buildLocal = () => new harper.LocalLinter(init);

  let linter: Linter;
  if (preferWorker && typeof Worker !== 'undefined') {
    try {
      linter = new harper.WorkerLinter(init);
    } catch {
      linter = buildLocal();
    }
  } else {
    linter = buildLocal();
  }

  try {
    await linter.setup();
  } catch (error) {
    // A worker can fail to boot at runtime (packaging/CSP issues). Fall back
    // to a main-thread linter so proofing still works, just synchronously.
    if (linter instanceof harper.WorkerLinter) {
      linter = buildLocal();
      await linter.setup();
    } else {
      throw error;
    }
  }

  return linter;
}

/**
 * Memoized linter accessor. A single WebAssembly linter is expensive to build
 * (it constructs Harper's curated dictionary), so it is shared across editors.
 */
let sharedLinter: Promise<Linter> | null = null;

export function getSharedHarperLinter(options?: CreateHarperLinterOptions): Promise<Linter> {
  if (!sharedLinter) {
    sharedLinter = createHarperLinter(options).catch((error) => {
      // Reset so a later call can retry instead of caching the rejection.
      sharedLinter = null;
      throw error;
    });
  }
  return sharedLinter;
}
