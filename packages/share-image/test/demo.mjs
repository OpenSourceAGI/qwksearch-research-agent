#!/usr/bin/env node
// Real upload check: runs the CLI against Imgur and prints what went in and what came out.
// Imgur IDs are random, so the link is only checked against the expected shape.
//
//   bun demo                 upload the sample image below
//   bun demo <url|file|...>  upload something else
//
// Uploads are public and can't be deleted with this tool.

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/share-image.mjs", import.meta.url));
const SAMPLE =
	"https://compote.slate.com/images/b136d0ff-db57-4a8b-9a3b-b280e373f27f.jpeg?crop=1560%2C1040%2Cx0%2Cy0&s=image-1170";

const IMGUR_LINK = /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]+\.[A-Za-z0-9]+$/;
const FILE_NAME = /([^/\\?#]+\.[A-Za-z0-9]+)(?:[?#]|$)/;

const args = process.argv.slice(2);
const inputs = args.length > 0 ? args : [SAMPLE];

const { stdout, stderr } = await new Promise(resolve => {
	execFile(process.execPath, [...process.execArgv, CLI, "--json", ...inputs], (_error, stdout, stderr) =>
		resolve({ stdout, stderr }),
	);
});

let results;
try {
	results = JSON.parse(stdout);
} catch {
	console.error(`FAIL: the CLI didn't print JSON\n${stderr}`);
	process.exit(1);
}

let failed = false;
for (const { input, imgur, error } of results) {
	console.log(`input file: ${input.match(FILE_NAME)?.[1] ?? input}`);
	if (error) {
		failed = true;
		console.log(`FAIL: ${error}`);
	} else if (IMGUR_LINK.test(imgur)) {
		console.log(`output url: ${imgur}`);
	} else {
		failed = true;
		console.log(`FAIL: not an Imgur image link: ${imgur}`);
	}
}

process.exitCode = failed ? 1 : 0;
