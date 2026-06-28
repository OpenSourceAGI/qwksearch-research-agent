#!/usr/bin/env node

/**
 * Patch vinext to be compatible with the installed vite (^7) which renamed /
 * removed some of the internal exports vinext relies on.
 *
 * Two incompatibilities are handled:
 *
 *   1. dist/build/report.js imports `parseSync` from "vite", which no longer
 *      exists. We swap it for an equivalent @babel/parser based shim.
 *      Fixes: "SyntaxError: The requested module vite does not provide an
 *      export named parseSync"
 *
 *   2. dist/index.js imports `transformWithOxc` from "vite", which is not
 *      exported by vite 7. We swap it for a shim built on the still-exported
 *      `transformWithEsbuild`.
 *      Fixes: "SyntaxError: The requested module vite does not provide an
 *      export named transformWithOxc"
 */

const fs = require('fs');
const path = require('path');

const vinextDist = path.join(__dirname, '../node_modules/vinext/dist');

function patchReportJs() {
  const reportJsPath = path.join(vinextDist, 'build/report.js');

  if (!fs.existsSync(reportJsPath)) {
    console.log('vinext report.js not found, skipping parseSync patch');
    return;
  }

  const content = fs.readFileSync(reportJsPath, 'utf-8');

  if (content.includes('babelParse')) {
    console.log('vinext report.js already patched (parseSync)');
    return;
  }

  if (!content.includes('import { parseSync } from "vite"')) {
    console.log('vinext report.js does not have the expected parseSync import, skipping');
    return;
  }

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
}`
  );

  fs.writeFileSync(reportJsPath, patched);
  console.log('✓ patched vinext report.js to use @babel/parser');
}

function patchIndexJs() {
  const indexJsPath = path.join(vinextDist, 'index.js');

  if (!fs.existsSync(indexJsPath)) {
    console.log('vinext index.js not found, skipping transformWithOxc patch');
    return;
  }

  const content = fs.readFileSync(indexJsPath, 'utf-8');

  if (content.includes('transformWithOxcShim')) {
    console.log('vinext index.js already patched (transformWithOxc)');
    return;
  }

  if (!content.includes('transformWithOxc')) {
    console.log('vinext index.js does not reference transformWithOxc, skipping');
    return;
  }

  let patched = content;

  // 1. Replace the import: drop transformWithOxc, pull in transformWithEsbuild
  //    and define a shim that mirrors the transformWithOxc(code, id, options)
  //    signature using esbuild.
  // Target the specific `import { ... } from "vite"` statement that pulls in
  // transformWithOxc (there may be other vite imports we must not disturb).
  const importRe = /import\s*\{([^}]*\btransformWithOxc\b[^}]*)\}\s*from\s*"vite";/;
  const importMatch = content.match(importRe);
  if (!importMatch) {
    console.log('vinext index.js vite import not found in expected form, skipping');
    return;
  }

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

  patched = patched.replace(importRe, shim);

  // 2. Re-point call sites at the shim.
  patched = patched.replace(/\btransformWithOxc\(/g, 'transformWithOxcShim(');

  fs.writeFileSync(indexJsPath, patched);
  console.log('✓ patched vinext index.js to use transformWithEsbuild');
}

if (!fs.existsSync(vinextDist)) {
  console.log('vinext not yet installed, skipping patch');
  process.exit(0);
}

patchReportJs();
patchIndexJs();
