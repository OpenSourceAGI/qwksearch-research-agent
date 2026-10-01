/**
 * @fileoverview Keeps the editor out of the `ReasonDocs` shell's static import
 * graph.
 *
 * Hosts mount `ReasonDocs` as their app shell even when the main area shows
 * something else (research-agent-ui puts its chat window there), so whatever
 * `ReasonDocs` imports statically is downloaded on every page that mounts the
 * shell. The editor engines (Plate, Tiptap and everything under them) are
 * loaded with `import()` from `EditorArea` instead, and the dialogs and the
 * floating outline from `ReasonDocs` itself. One stray static import of an
 * editor module would put the whole stack back into the shell's chunk with
 * nothing else failing, which is what this test catches.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/** Resolves a relative or `@/` import to a source file, or `null` for a bare one. */
function resolveLocal(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = resolve(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => resolve(base, 'index' + ext)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.[jt]sx?$/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Every statically imported specifier in a file. Type-only and `import()` imports are skipped. */
function staticSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

/** Every bare (npm) specifier reachable from `entry` through static imports. */
function staticBareImports(entry: string): Set<string> {
  const bare = new Set<string>();
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const spec of staticSpecifiers(file)) {
      const local = resolveLocal(file, spec);
      if (local) queue.push(local);
      else if (!spec.startsWith('.') && !spec.startsWith('@/')) bare.add(spec);
    }
  }

  return bare;
}

const EDITOR_PACKAGES = [/^platejs/, /^@platejs\//, /^@tiptap\//, /^novel$/, /^katex/, /^easydrawer/];
const isEditorPackage = (spec: string) => EDITOR_PACKAGES.some((pattern) => pattern.test(spec));

describe('ReasonDocs shell', () => {
  it('does not statically import an editor engine', () => {
    const leaked = [...staticBareImports(resolve(SRC, 'editor/ReasonDocs.tsx'))].filter(isEditorPackage);

    expect(leaked).toEqual([]);
  });

  it('loads both editor wrappers from EditorArea with import()', () => {
    const source = readFileSync(resolve(SRC, 'editor/EditorArea.tsx'), 'utf8');

    expect(source).toMatch(/import\(\s*['"]\.\/PlateEditorWrapper['"]\s*\)/);
    expect(source).toMatch(/import\(\s*['"]\.\/TiptapEditorWrapper['"]\s*\)/);
  });

  it('still reaches Plate from the Plate wrapper', () => {
    // The inverse check: without it, the first test would also pass if the
    // walker silently stopped following imports.
    const imports = [...staticBareImports(resolve(SRC, 'editor/PlateEditorWrapper.tsx'))];

    expect(imports.some((spec) => /^platejs/.test(spec))).toBe(true);
  });
});
