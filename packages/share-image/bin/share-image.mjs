#!/usr/bin/env node
// Upload images to Imgur anonymously by URL, file or folder and print the Imgur link for each.
// Requires Node 18+. Uses sharp for JPEG→PNG conversion.

import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

import sharp from "sharp";

const USAGE = `Usage:
  share-image [--json] <url|file|folder> [...]
  share-image [--json] '["<url|file|folder>", ...]'

Folders are searched for images, including in subfolders. Hidden files and
folders and symlinks are skipped. Uploads are public and can't be deleted.

Images upload one at a time. Progress such as "[2/5] Uploading photos/b.jpg"
goes to stderr, so stdout stays safe to pipe.

Uploads that fail with a timeout, a network error, rate limiting (429) or a
server error (5xx) are retried up to 3 more times, one at a time, waiting
longer before each round (2s, then 4s, then 8s).

Prints one "<url or file path><TAB><imgur url>" line per image as soon as that
image is done, so an image that needed a retry is printed after the others.
A failed upload prints "<url or file path><TAB>ERROR: <reason>" and the exit code is 1.

The Imgur links, and nothing else, are also copied to the clipboard, one per line.

Options:
  --json      Print a JSON array of {"input", "imgur"} or {"input", "error"}
  -h, --help  Show this help

Environment:
  IMGUR_CLIENT_ID      Imgur API client ID (defaults to a built-in shared ID)
  IMGUR_CLIENT_SECRET  Imgur API client secret (defaults to a built-in shared secret)`;

const API_URL = "https://api.imgur.com/3/image";
const CLIENT_ID = process.env.IMGUR_CLIENT_ID || "9b0aa5cb5d65843";
const CLIENT_SECRET = process.env.IMGUR_CLIENT_SECRET || "97851ab8356b4994619acc566d854529b0ca640f";
const TIMEOUT_MS = 60_000;
const IMAGE_EXTENSIONS = new Set([
	".apng", ".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".svg", ".tif", ".tiff", ".webp",
]);

// JPEG files start with FF D8 FF. PNG files stay PNG; nothing is ever converted to JPEG.
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function isJpeg(buffer) {
	return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function toPng(buffer) {
	if (isJpeg(buffer)) {
		return await sharp(buffer).png().toBuffer();
	}
	return buffer;
}

// Retrying with the image bytes can't help when the client is rejected or rate limited.
const NO_FALLBACK_STATUSES = new Set([401, 403, 429]);

// Tried in order until one works. Linux varies by display server, so wl-copy fails over to xclip.
const CLIPBOARD_COMMANDS = {
	darwin: [["pbcopy"]],
	win32: [["clip"]],
};
const DEFAULT_CLIPBOARD_COMMANDS = [["wl-copy"], ["xclip", "-selection", "clipboard"]];
const CLIPBOARD_TIMEOUT_MS = 5_000;

// Each retry round waits twice as long as the last: 2s, 4s, 8s.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = Number(process.env.SHARE_IMG_RETRY_DELAY_MS ?? 2_000);

class ImgurError extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
}

async function postImage(image) {
	const response = await fetch(API_URL, {
		method: "POST",
		headers: { Authorization: `Client-ID ${CLIENT_ID}` },
		body: new URLSearchParams({ image }),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});

	const text = await response.text();
	let body = null;
	try {
		body = JSON.parse(text);
	} catch {
		// Rate limit and gateway errors can come back as HTML.
	}

	const link = body?.data?.link;
	if (!response.ok || !link) {
		const error = body?.data?.error;
		const reason = error?.message ?? (typeof error === "string" ? error : null);
		throw new ImgurError(reason ?? `HTTP ${response.status}`, response.status);
	}

	return link.replace(/^http:/, "https:");
}

async function downloadAsBase64(url) {
	const response = await fetch(url, {
		headers: { "User-Agent": "imgur-upload-cli/1.0" },
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function upload(input) {
	let protocol;
	try {
		protocol = new URL(input).protocol;
	} catch {
		throw new Error("not a valid URL or an existing file or folder");
	}

	if (protocol === "data:") {
		return postImage(input.split(",")[1] ?? "");
	}
	if (protocol !== "http:" && protocol !== "https:") {
		throw new Error(`unsupported URL scheme "${protocol}"`);
	}

	try {
		return await postImage(input);
	} catch (imgurError) {
		if (NO_FALLBACK_STATUSES.has(imgurError.status)) {
			throw imgurError;
		}

		// Imgur couldn't fetch the URL itself, so send the image bytes instead.
		let image;
		try {
			image = await downloadAsBase64(input);
		} catch (downloadError) {
			// Keep the Imgur error as the cause so a rate limit or outage is still retried.
			throw new Error(`Imgur: ${imgurError.message}; direct download: ${downloadError.message}`, {
				cause: imgurError,
			});
		}
		const bytes = Buffer.from(image, "base64");
		const png = await toPng(bytes);
		return postImage(png.toString("base64"));
	}
}

async function findImages(folder) {
	let entries;
	try {
		entries = await readdir(folder, { withFileTypes: true });
	} catch (error) {
		return [{ input: folder, error: error.message }];
	}

	entries.sort((a, b) => a.name.localeCompare(b.name));

	const items = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) {
			continue;
		}
		const path = join(folder, entry.name);
		if (entry.isDirectory()) {
			items.push(...await findImages(path));
		} else if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
			items.push({ input: path, isFile: true });
		}
	}
	return items;
}

async function expandInputs(inputs) {
	const items = [];
	for (const input of inputs) {
		// Anything that isn't on disk, such as a URL, makes stat fail.
		const stats = await stat(input).catch(() => null);
		if (stats?.isDirectory()) {
			progress(`Scanning ${input} for images...`);
			const found = await findImages(input);
			const count = found.filter(item => !item.error).length;
			progress(`Found ${count} image${count === 1 ? "" : "s"} in ${input}`);
			items.push(...(found.length > 0 ? found : [{ input, error: "no images found in folder" }]));
		} else {
			items.push({ input, isFile: stats?.isFile() ?? false });
		}
	}
	return items;
}

async function uploadItem({ input, isFile, error }) {
	if (error) {
		throw new Error(error);
	}
	if (isFile) {
		const buffer = await readFile(input);
		const png = await toPng(buffer);
		return postImage(png.toString("base64"));
	}
	return upload(input);
}

// Failures worth another try: timeouts, network errors, rate limits and server errors.
// A bad image, a missing file or a rejected client fails the same way every time.
function isRetryable(error) {
	if (!error) {
		return false;
	}
	if (error.name === "TimeoutError" || error.name === "AbortError" || error instanceof TypeError) {
		return true;
	}
	if (error instanceof ImgurError) {
		return error.status === 408 || error.status === 429 || error.status >= 500 || /over capacity/i.test(error.message);
	}
	return isRetryable(error.cause);
}

async function attempt(item) {
	try {
		return { result: { input: item.input, imgur: await uploadItem(item) }, retry: false };
	} catch (error) {
		return { result: { input: item.input, error: error.message }, retry: isRetryable(error) };
	}
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// One at a time. Each result is reported as soon as it's final; results keep input order.
async function uploadAll(items, onResult) {
	const results = new Array(items.length);
	let pending = [];

	for (const [index, item] of items.entries()) {
		progress(`[${index + 1}/${items.length}] Uploading ${item.input}`);
		const { result, retry } = await attempt(item);
		results[index] = result;
		if (retry) {
			progress(`[${index + 1}/${items.length}] Failed, will retry: ${result.error}`);
			pending.push(index);
		} else {
			onResult(result);
		}
	}

	for (let round = 1; round <= MAX_RETRIES && pending.length > 0; round++) {
		const delay = RETRY_BASE_DELAY_MS * 2 ** (round - 1);
		const stillFailing = [];
		for (const [position, index] of pending.entries()) {
			progress(`Retry ${round}/${MAX_RETRIES} [${position + 1}/${pending.length}]: waiting ${delay / 1000}s, then uploading ${items[index].input}`);
			await sleep(delay);
			const { result, retry } = await attempt(items[index]);
			results[index] = result;
			if (retry && round < MAX_RETRIES) {
				stillFailing.push(index);
			} else {
				onResult(result);
			}
		}
		pending = stillFailing;
	}

	return results;
}

function progress(message) {
	console.error(message);
}

function pipeToCommand([command, ...args], text) {
	return new Promise(resolve => {
		const child = spawn(command, args, {
			stdio: ["pipe", "ignore", "ignore"],
			timeout: CLIPBOARD_TIMEOUT_MS,
		});
		child.on("error", () => resolve(false));
		child.on("close", code => resolve(code === 0));
		// A missing or crashing command closes the pipe, which "error" and "close" already report.
		child.stdin.on("error", () => {});
		child.stdin.end(text);
	});
}

async function copyToClipboard(text) {
	for (const command of CLIPBOARD_COMMANDS[process.platform] ?? DEFAULT_CLIPBOARD_COMMANDS) {
		if (await pipeToCommand(command, text)) {
			return true;
		}
	}
	return false;
}

function usageError(message) {
	console.error(`${message}\n\n${USAGE}`);
	process.exit(2);
}

function parseArgs(argv) {
	const inputs = [];
	let json = false;

	for (const arg of argv) {
		if (arg === "-h" || arg === "--help") {
			console.log(USAGE);
			process.exit(0);
		} else if (arg === "--json") {
			json = true;
		} else if (arg.startsWith("-")) {
			usageError(`Unknown option: ${arg}`);
		} else if (arg.trimStart().startsWith("[")) {
			let urls;
			try {
				urls = JSON.parse(arg);
			} catch (error) {
				usageError(`Invalid JSON array: ${error.message}`);
			}
			if (!urls.every(url => typeof url === "string")) {
				usageError("JSON array must contain only URL strings");
			}
			inputs.push(...urls);
		} else {
			inputs.push(arg);
		}
	}

	if (inputs.length === 0) {
		usageError("No image URLs, files or folders given");
	}
	return { inputs, json };
}

const { inputs, json } = parseArgs(process.argv.slice(2));
const results = await uploadAll(await expandInputs(inputs), ({ input, imgur, error }) => {
	if (!json) {
		console.log(`${input}\t${imgur ?? `ERROR: ${error}`}`);
	}
});

if (json) {
	console.log(JSON.stringify(results, null, 2));
}

const failed = results.filter(result => result.error).length;
progress(`Done: ${results.length - failed} uploaded, ${failed} failed`);

// Status goes to stderr so stdout stays safe to parse. The exit code only reports uploads.
const links = results.flatMap(result => result.imgur ?? []);
if (links.length > 0) {
	console.error((await copyToClipboard(links.join("\n"))) ? "Copied to clipboard" : "Couldn't copy to clipboard");
}

process.exitCode = results.some(result => result.error) ? 1 : 0;
