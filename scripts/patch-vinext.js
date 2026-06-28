#!/usr/bin/env node

/**
 * Patch vinext to use @babel/parser instead of non-existent vite.parseSync
 * This fixes: "SyntaxError: The requested module vite does not provide an export named parseSync"
 */

const fs = require('fs');
const path = require('path');

const reportJsPath = path.join(__dirname, '../node_modules/vinext/dist/build/report.js');

if (!fs.existsSync(reportJsPath)) {
  console.log('vinext not yet installed, skipping patch');
  process.exit(0);
}

const content = fs.readFileSync(reportJsPath, 'utf-8');

// Check if already patched
if (content.includes('babelParse')) {
  console.log('vinext already patched');
  process.exit(0);
}

// Check if it has the old import
if (!content.includes('import { parseSync } from "vite"')) {
  console.log('vinext does not have the expected parseSync import, skipping patch');
  process.exit(0);
}

const patchedContent = content.replace(
  'import { parseSync } from "vite";',
  `import { parse as babelParse } from "@babel/parser";

function parseSync(filename, code, options) {
	try {
		const program = babelParse(code, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
			errorRecovery: true
		});
		return {
			program,
			errors: program.errors || []
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

fs.writeFileSync(reportJsPath, patchedContent);
console.log('✓ patched vinext to use @babel/parser');
