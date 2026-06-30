#!/usr/bin/env node

/**
 * Patch vinext to be compatible with the installed vite (^7) which renamed /
 * removed some of the internal exports vinext relies on.
 *
 * Two incompatibilities are handled:
 *
 *   1. Files that import `parseSync` from "vite" (e.g. dist/build/report.js in
 *      vinext 0.1.8, dist/init-cloudflare.js in 0.2.0). `parseSync` no longer
 *      exists, so we swap the import for an equivalent @babel/parser shim.
 *      Fixes: "SyntaxError: The requested module vite does not provide an
 *      export named parseSync"
 *
 *   2. dist/index.js imports `transformWithOxc` from "vite", which is not
 *      exported by vite 7. We swap it for a shim built on the still-exported
 *      `transformWithEsbuild`.
 *      Fixes: "SyntaxError: The requested module vite does not provide an
 *      export named transformWithOxc"
 *
 * This repo is a bun workspace monorepo, and several workspaces depend on
 * vinext. Depending on resolution, bun may hoist vinext to the repo-root
 * node_modules OR keep a nested copy inside a workspace's node_modules — and
 * which one "wins" the root slot is not deterministic across machines. The
 * build resolves whichever copy is nearest the workspace, so patching only the
 * root copy can silently miss the one actually used. To be robust, we discover
 * and patch *every* installed vinext copy.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

// Candidate node_modules locations where vinext may be installed: the repo
// root plus every workspace under apps/* and packages/*.
function findVinextDists() {
  const candidates = [path.join(repoRoot, 'node_modules/vinext/dist')];

  for (const group of ['apps', 'packages']) {
    const groupDir = path.join(repoRoot, group);
    let entries = [];
    try {
      entries = fs.readdirSync(groupDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      candidates.push(
        path.join(groupDir, entry.name, 'node_modules/vinext/dist'),
      );
    }
  }

  return candidates.filter((dist) => fs.existsSync(dist));
}

// Recursively collect *.js files under a directory.
function collectJsFiles(dir) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function patchParseSync(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('babelParse')) return false; // already patched
  if (!content.includes('import { parseSync } from "vite"')) return false;

  const patched = content.replace(
    'import { parseSync } from "vite";',
    `import { parse as babelParse } from "@babel/parser";

// vinext's report code consumes an ESTree/oxc-shaped AST: it iterates
// \`program.body\` directly and matches ESTree node types (e.g. "Literal").
// The "estree" plugin makes @babel/parser emit ESTree-compatible nodes, and
// we return \`file.program\` (the Program node) rather than the wrapping File
// node so that \`program.body\` is iterable.
function parseSync(filename, code, options) {
	try {
		const file = babelParse(code, {
			sourceType: "module",
			plugins: ["estree", "typescript", "jsx"],
			errorRecovery: true
		});
		return {
			program: file.program,
			errors: (file.errors || []).map((err) => ({
				severity: "Error",
				message: err.message
			}))
		};
	} catch (err) {
		return {
			program: null,
			errors: [{
				severity: "Error",
				message: err.message
			}]
		};
	}
}`,
  );

  fs.writeFileSync(filePath, patched);
  return true;
}

function patchTransformWithOxc(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('transformWithOxcShim')) return false; // already patched
  if (!content.includes('transformWithOxc')) return false;

  // Replace the import: drop transformWithOxc, pull in transformWithEsbuild and
  // define a shim that mirrors the transformWithOxc(code, id, options)
  // signature using esbuild. Target the specific `import { ... } from "vite"`
  // statement that pulls in transformWithOxc (there may be other vite imports
  // we must not disturb).
  const importRe = /import\s*\{([^}]*\btransformWithOxc\b[^}]*)\}\s*from\s*"vite";/;
  const importMatch = content.match(importRe);
  if (!importMatch) return false;

  const names = importMatch[1]
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n && n !== 'transformWithOxc');
  if (!names.includes('transformWithEsbuild')) {
    names.push('transformWithEsbuild');
  }

  const shim = `import { ${names.join(', ')} } from "vite";

async function transformWithOxcShim(code, id, options) {
	const opts = options || {};
	const result = await transformWithEsbuild(code, id, {
		loader: opts.lang || "jsx",
		jsx: opts.jsx && opts.jsx.runtime === "automatic" ? "automatic" : "transform",
		sourcemap: opts.sourcemap !== false
	});
	return { code: result.code, map: result.map };
}`;

  let patched = content.replace(importRe, shim);
  // Re-point call sites at the shim.
  patched = patched.replace(/\btransformWithOxc\(/g, 'transformWithOxcShim(');

  fs.writeFileSync(filePath, patched);
  return true;
}

const dists = findVinextDists();
if (dists.length === 0) {
  console.log('vinext not yet installed, skipping patch');
  process.exit(0);
}

let parseSyncPatched = 0;
let oxcPatched = 0;

for (const dist of dists) {
  for (const file of collectJsFiles(dist)) {
    if (patchParseSync(file)) parseSyncPatched++;
    if (patchTransformWithOxc(file)) oxcPatched++;
  }
}

console.log(
  `✓ patched vinext in ${dists.length} location(s): ` +
    `${parseSyncPatched} parseSync, ${oxcPatched} transformWithOxc file(s)`,
);
