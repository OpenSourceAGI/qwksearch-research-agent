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

function getWorkspacePaths() {
  const rootPkgPath = path.join(repoRoot, 'package.json');
  if (!fs.existsSync(rootPkgPath)) {
    return [];
  }

  let workspaces = [];
  try {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
    workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : [];
  } catch {
    return [];
  }

  const paths = [];
  for (const pattern of workspaces) {
    if (!pattern.endsWith('/*')) {
      continue;
    }
    const baseDir = path.join(repoRoot, pattern.slice(0, -2));
    if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
      continue;
    }

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        paths.push(path.join(baseDir, entry.name));
      }
    }
  }

  return paths;
}

function getVinextDistDirs() {
  const candidates = [
    path.join(repoRoot, 'node_modules/vinext/dist'),
    ...getWorkspacePaths().map((workspacePath) =>
      path.join(workspacePath, 'node_modules/vinext/dist')
    )
  ];

  return candidates.filter((candidatePath) => fs.existsSync(candidatePath));
}

function patchReportJs(vinextDist) {
  const reportJsPath = path.join(vinextDist, 'build/report.js');

  if (!fs.existsSync(reportJsPath)) {
    console.log('vinext report.js not found, skipping parseSync patch');
    return;
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

  fs.writeFileSync(reportJsPath, patched);
  console.log(`✓ patched ${path.relative(repoRoot, reportJsPath)} to use @babel/parser`);
}

function patchIndexJs(vinextDist) {
  const indexJsPath = path.join(vinextDist, 'index.js');

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

  fs.writeFileSync(indexJsPath, patched);
  console.log(`✓ patched ${path.relative(repoRoot, indexJsPath)} to use transformWithEsbuild`);
}

const vinextDistDirs = getVinextDistDirs();

if (vinextDistDirs.length === 0) {
  console.log('vinext not yet installed in known node_modules locations, skipping patch');
  process.exit(0);
}

for (const vinextDist of vinextDistDirs) {
  patchReportJs(vinextDist);
  patchIndexJs(vinextDist);
}
