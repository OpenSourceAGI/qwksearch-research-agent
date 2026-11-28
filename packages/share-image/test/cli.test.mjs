import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const CLI = fileURLToPath(new URL("../bin/share-image.mjs", import.meta.url));
const DEMO = fileURLToPath(new URL("./demo.mjs", import.meta.url));
const MOCK_FETCH = fileURLToPath(new URL("./mock-fetch.cjs", import.meta.url));

const API_URL = "https://api.imgur.com/3/image";
const DEFAULT_CLIENT_ID = "9b0aa5cb5d65843";
const IMAGE_URL = "https://example.com/a.png";
const IMAGE_BYTES = "fake image bytes";
const IMAGE_BASE64 = Buffer.from(IMAGE_BYTES).toString("base64");

const uploaded = (link = "https://i.imgur.com/abc.png") => ({ body: { data: { link } } });
const rejected = (status, error = "rejected") => ({ status, body: { data: { error } } });
const base64 = contents => Buffer.from(contents).toString("base64");

async function makeJpeg(dir, name = "photo.jpg", color = { r: 255, g: 0, b: 0 }) {
	const path = join(dir, name);
	await sharp({
		create: {
			width: 1,
			height: 1,
			channels: 3,
			background: color,
		},
	})
		.jpeg()
		.toFile(path);
	return path;
}

async function makePng(dir, name = "image.png", color = { r: 0, g: 255, b: 0 }) {
	const path = join(dir, name);
	await sharp({
		create: {
			width: 1,
			height: 1,
			channels: 3,
			background: color,
		},
	})
		.png()
		.toFile(path);
	return path;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

// Creates files from a { "relative/path": contents } map for the length of the callback.
async function withFiles(files, callback) {
	const dir = await mkdtemp(join(tmpdir(), "share-image-files-"));
	try {
		for (const [path, contents] of Object.entries(files)) {
			await mkdir(dirname(join(dir, path)), { recursive: true });
			await writeFile(join(dir, path), contents);
		}
		return await callback(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

// Puts stand-ins for the clipboard commands on PATH so tests never touch the real clipboard.
async function installFakeClipboard(dir) {
	const binDir = join(dir, "bin");
	await mkdir(binDir);
	for (const name of ["pbcopy", "wl-copy", "xclip"]) {
		const path = join(binDir, name);
		await writeFile(path, '#!/bin/sh\n[ -z "$FAKE_CLIPBOARD_FAIL" ] || exit 1\n/bin/cat > "$FAKE_CLIPBOARD_FILE"\n');
		await chmod(path, 0o755);
	}
	return binDir;
}

async function run(args, { routes = {}, env = {}, script = CLI } = {}) {
	const dir = await mkdtemp(join(tmpdir(), "share-image-test-"));
	const logPath = join(dir, "requests.log");
	const clipboardPath = join(dir, "clipboard");

	try {
		const binDir = await installFakeClipboard(dir);
		const { IMGUR_CLIENT_ID, IMGUR_CLIENT_SECRET, ...cleanEnv } = process.env;
		const { code, stdout, stderr } = await new Promise(resolve => {
			execFile(
				process.execPath,
				["--require", MOCK_FETCH, script, ...args],
				{
					env: {
						...cleanEnv,
						PATH: binDir,
						FAKE_CLIPBOARD_FILE: clipboardPath,
						// No waiting between retries unless a test asks for it.
						SHARE_IMG_RETRY_DELAY_MS: "0",
						...env,
						MOCK_FETCH_ROUTES: JSON.stringify(routes),
						MOCK_FETCH_LOG: logPath,
					},
				},
				(error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }),
			);
		});

		const clipboard = await readFile(clipboardPath, "utf8").catch(() => null);
		const log = await readFile(logPath, "utf8").catch(() => "");
		const calls = log
			.split("\n")
			.filter(Boolean)
			.map(line => JSON.parse(line));

		assert.deepEqual(
			calls.filter(call => call.unmatched).map(call => call.key),
			[],
			"the CLI made a request the test didn't expect",
		);
		return { code, stdout, stderr, calls, clipboard };
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("arguments", () => {
	for (const flag of ["-h", "--help"]) {
		test(`${flag} prints usage and exits 0`, async () => {
			const { code, stdout, calls } = await run([flag]);
			assert.equal(code, 0);
			assert.match(stdout, /^Usage:/);
			assert.equal(calls.length, 0);
		});
	}

	const invalid = [
		["no arguments", [], /No image URLs, files or folders given/],
		["only --json", ["--json"], /No image URLs, files or folders given/],
		["an empty JSON array", ["[]"], /No image URLs, files or folders given/],
		["an unknown option", ["--nope", IMAGE_URL], /Unknown option: --nope/],
		["malformed JSON", ['["https://example.com/a.png"'], /Invalid JSON array/],
		["non-strings in a JSON array", ['["https://example.com/a.png", 1]'], /only URL strings/],
	];

	for (const [name, args, message] of invalid) {
		test(`${name} prints usage to stderr and exits 2`, async () => {
			const { code, stdout, stderr, calls } = await run(args);
			assert.equal(code, 2);
			assert.equal(stdout, "");
			assert.match(stderr, message);
			assert.match(stderr, /Usage:/);
			assert.equal(calls.length, 0);
		});
	}

	test("accepts a JSON array, with leading whitespace", async () => {
		const { code, stdout } = await run([`  ["${IMAGE_URL}"]`], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
	});

	test("combines positional URLs and JSON arrays in argument order", async () => {
		const routes = {
			"POST https://example.com/1.png": uploaded("https://i.imgur.com/1.png"),
			"POST https://example.com/2.png": uploaded("https://i.imgur.com/2.png"),
			"POST https://example.com/3.png": uploaded("https://i.imgur.com/3.png"),
		};
		const { stdout } = await run(
			["https://example.com/1.png", '["https://example.com/2.png"]', "https://example.com/3.png"],
			{ routes },
		);
		assert.equal(
			stdout,
			[
				"https://example.com/1.png\thttps://i.imgur.com/1.png",
				"https://example.com/2.png\thttps://i.imgur.com/2.png",
				"https://example.com/3.png\thttps://i.imgur.com/3.png",
				"",
			].join("\n"),
		);
	});

	test("--json works after the URLs", async () => {
		const { stdout } = await run([IMAGE_URL, "--json"], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
		});
		assert.deepEqual(JSON.parse(stdout), [{ input: IMAGE_URL, imgur: "https://i.imgur.com/abc.png" }]);
	});
});

describe("the Imgur request", () => {
	test("posts the URL as a form field with a timeout", async () => {
		const { calls } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: uploaded() } });
		assert.equal(calls.length, 1);
		const [call] = calls;
		assert.equal(call.method, "POST");
		assert.equal(call.url, API_URL);
		assert.equal(call.image, IMAGE_URL);
		assert.equal(call.contentType, "URLSearchParams");
		assert.equal(call.hasTimeout, true);
	});

	test("uses the built-in client ID by default", async () => {
		const { calls } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: uploaded() } });
		assert.equal(calls[0].headers.Authorization, `Client-ID ${DEFAULT_CLIENT_ID}`);
	});

	test("IMGUR_CLIENT_ID overrides the client ID", async () => {
		const { calls } = await run([IMAGE_URL], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded() },
			env: { IMGUR_CLIENT_ID: "my-client-id" },
		});
		assert.equal(calls[0].headers.Authorization, "Client-ID my-client-id");
	});

	test("rewrites an http link to https", async () => {
		const { stdout } = await run([IMAGE_URL], {
			routes: { [`POST ${IMAGE_URL}`]: uploaded("http://i.imgur.com/abc.png") },
		});
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
	});

	test("sends only the base64 payload of a data: URL", async () => {
		const input = `data:image/png;base64,${IMAGE_BASE64}`;
		const { code, stdout, calls } = await run([input], {
			routes: { [`POST ${IMAGE_BASE64}`]: uploaded() },
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${input}\thttps://i.imgur.com/abc.png\n`);
		assert.equal(calls.length, 1);
	});
});

describe("inputs rejected before any request", () => {
	const cases = [
		["a string that isn't a URL", "not-a-url", "not a valid URL or an existing file or folder"],
		["an empty string", "", "not a valid URL or an existing file or folder"],
		["an unsupported scheme", "ftp://example.com/a.png", 'unsupported URL scheme "ftp:"'],
		["a file: URL", "file:///etc/passwd", 'unsupported URL scheme "file:"'],
	];

	for (const [name, input, reason] of cases) {
		test(name, async () => {
			const { code, stdout, calls } = await run([input]);
			assert.equal(code, 1);
			assert.equal(stdout, `${input}\tERROR: ${reason}\n`);
			assert.equal(calls.length, 0);
		});
	}
});

describe("fallback to sending the image bytes", () => {
	test("downloads and uploads the image when Imgur can't fetch the URL", async () => {
		const { code, stdout, calls } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: uploaded(),
			},
		});
		assert.equal(code, 0);
		assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
		assert.deepEqual(
			calls.map(call => call.key),
			[`POST ${IMAGE_URL}`, `GET ${IMAGE_URL}`, `POST ${IMAGE_BASE64}`],
		);
	});

	test("the download sends a User-Agent and has a timeout", async () => {
		const { calls } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: uploaded(),
			},
		});
		const download = calls.find(call => call.method === "GET");
		assert.equal(download.headers["User-Agent"], "imgur-upload-cli/1.0");
		assert.equal(download.hasTimeout, true);
	});

	const triggers = [
		["a network error", { networkError: "fetch failed" }],
		["a 500 with an HTML body", { status: 500, body: "<html>Bad gateway</html>" }],
		["a 200 with no link", { body: { data: {} } }],
	];

	for (const [name, response] of triggers) {
		test(`falls back on ${name}`, async () => {
			const { code, stdout } = await run([IMAGE_URL], {
				routes: {
					[`POST ${IMAGE_URL}`]: response,
					[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
					[`POST ${IMAGE_BASE64}`]: uploaded(),
				},
			});
			assert.equal(code, 0);
			assert.equal(stdout, `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`);
		});
	}

	for (const status of [401, 403, 429]) {
		test(`doesn't fall back on ${status}`, async () => {
			const { code, stdout, calls } = await run([IMAGE_URL], {
				routes: { [`POST ${IMAGE_URL}`]: rejected(status, "Too many requests") },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `${IMAGE_URL}\tERROR: Too many requests\n`);
			// A 429 is retried 3 times; 401 and 403 aren't. None of them fall back to a download.
			assert.equal(calls.length, status === 429 ? 4 : 1);
			assert.ok(calls.every(call => call.method === "POST"));
		});
	}

	test("doesn't fall back for a data: URL", async () => {
		const input = `data:image/png;base64,${IMAGE_BASE64}`;
		const { code, stdout, calls } = await run([input], {
			routes: { [`POST ${IMAGE_BASE64}`]: rejected(400, "Bad image") },
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${input}\tERROR: Bad image\n`);
		assert.equal(calls.length, 1);
	});

	test("reports both errors when the download returns an error status", async () => {
		const { code, stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { status: 404 },
			},
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Imgur: Invalid URL; direct download: HTTP 404\n`);
	});

	test("reports both errors when the download hits a network error", async () => {
		const { stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { networkError: "fetch failed" },
			},
		});
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Imgur: Invalid URL; direct download: fetch failed\n`);
	});

	test("reports the second Imgur error when uploading the bytes fails", async () => {
		const { code, stdout } = await run([IMAGE_URL], {
			routes: {
				[`POST ${IMAGE_URL}`]: rejected(400, "Invalid URL"),
				[`GET ${IMAGE_URL}`]: { body: IMAGE_BYTES },
				[`POST ${IMAGE_BASE64}`]: rejected(400, "Unsupported file type"),
			},
		});
		assert.equal(code, 1);
		assert.equal(stdout, `${IMAGE_URL}\tERROR: Unsupported file type\n`);
	});
});

describe("Imgur error messages", () => {
	const cases = [
		["data.error.message", { status: 403, body: { data: { error: { message: "Nested reason" } } } }, "Nested reason"],
		["a data.error string", { status: 403, body: { data: { error: "Plain reason" } } }, "Plain reason"],
		["the status for a non-JSON body", { status: 429, body: "<html>Slow down</html>" }, "HTTP 429"],
		["the status for JSON with no error", { status: 403, body: { data: {} } }, "HTTP 403"],
	];

	for (const [name, response, reason] of cases) {
		test(`uses ${name}`, async () => {
			const { stdout } = await run([IMAGE_URL], { routes: { [`POST ${IMAGE_URL}`]: response } });
			assert.equal(stdout, `${IMAGE_URL}\tERROR: ${reason}\n`);
		});
	}
});

describe("files and folders", () => {
	test("uploads a file's bytes and prints its path", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { code, stdout, calls } = await run([path], {
				routes: { [`POST ${base64("logo")}`]: uploaded() },
			});
			assert.equal(code, 0);
			assert.equal(stdout, `${path}\thttps://i.imgur.com/abc.png\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("accepts a file in a JSON array", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { stdout } = await run([JSON.stringify([path])], {
				routes: { [`POST ${base64("logo")}`]: uploaded() },
			});
			assert.equal(stdout, `${path}\thttps://i.imgur.com/abc.png\n`);
		});
	});

	test("a failed file upload reports the error without a fallback", async () => {
		await withFiles({ "logo.png": "logo" }, async dir => {
			const path = join(dir, "logo.png");
			const { code, stdout, calls } = await run([path], {
				routes: { [`POST ${base64("logo")}`]: rejected(400, "Bad image") },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `${path}\tERROR: Bad image\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("finds images in subfolders, sorted by name, matching extensions in any case", async () => {
		const files = { "z.GIF": "z", "a.png": "a", "m/c.jpg": "c", "m/deep/d.webp": "d" };
		await withFiles(files, async dir => {
			const routes = Object.fromEntries(
				Object.values(files).map(contents => [
					`POST ${base64(contents)}`,
					uploaded(`https://i.imgur.com/${contents}.png`),
				]),
			);
			const { code, stdout, stderr } = await run([dir], { routes });
			assert.equal(code, 0);
			assert.deepEqual(stderr.split("\n").slice(0, 7), [
				`Scanning ${dir} for images...`,
				`Found 4 images in ${dir}`,
				`[1/4] Uploading ${join(dir, "a.png")}`,
				`[2/4] Uploading ${join(dir, "m/c.jpg")}`,
				`[3/4] Uploading ${join(dir, "m/deep/d.webp")}`,
				`[4/4] Uploading ${join(dir, "z.GIF")}`,
				"Done: 4 uploaded, 0 failed",
			]);
			assert.equal(
				stdout,
				[
					`${join(dir, "a.png")}\thttps://i.imgur.com/a.png`,
					`${join(dir, "m/c.jpg")}\thttps://i.imgur.com/c.png`,
					`${join(dir, "m/deep/d.webp")}\thttps://i.imgur.com/d.png`,
					`${join(dir, "z.GIF")}\thttps://i.imgur.com/z.png`,
					"",
				].join("\n"),
			);
		});
	});

	// Mixed case because filesystems tend to list in byte order, which puts "B" before "a".
	test("sorts by locale rather than keeping the filesystem's order", async () => {
		const names = ["B.png", "a.png", "D.png", "c.png"];
		const files = Object.fromEntries(names.map(name => [name, name]));
		await withFiles(files, async dir => {
			const routes = Object.fromEntries(names.map(name => [`POST ${base64(name)}`, uploaded()]));
			const { stdout } = await run([dir], { routes });
			assert.deepEqual(
				stdout.trimEnd().split("\n").map(line => line.split("\t")[0]),
				["a.png", "B.png", "c.png", "D.png"].map(name => join(dir, name)),
			);
		});
	});

	test("skips non-images, hidden files and folders, and symlinks", async () => {
		const files = {
			"keep.png": "keep",
			"notes.txt": "notes",
			"no-extension": "none",
			".hidden.png": "hidden",
			".git/inside.png": "inside",
		};
		await withFiles(files, async dir => {
			await symlink(join(dir, "keep.png"), join(dir, "link.png"));
			await symlink(join(dir, ".git"), join(dir, "linked-folder"));

			const { stdout, calls } = await run([dir], {
				routes: { [`POST ${base64("keep")}`]: uploaded() },
			});
			assert.equal(stdout, `${join(dir, "keep.png")}\thttps://i.imgur.com/abc.png\n`);
			assert.equal(calls.length, 1);
		});
	});

	test("a folder with no images is a failed upload", async () => {
		await withFiles({ "notes.txt": "notes" }, async dir => {
			const { code, stdout, calls } = await run([dir]);
			assert.equal(code, 1);
			assert.equal(stdout, `${dir}\tERROR: no images found in folder\n`);
			assert.equal(calls.length, 0);
		});
	});

	test("keeps argument order across URLs, folders and files", async () => {
		await withFiles({ "photos/a.png": "a", "photos/b.png": "b", "logo.png": "logo" }, async dir => {
			const routes = {
				[`POST ${IMAGE_URL}`]: uploaded("https://i.imgur.com/url.png"),
				[`POST ${base64("a")}`]: uploaded("https://i.imgur.com/a.png"),
				[`POST ${base64("b")}`]: uploaded("https://i.imgur.com/b.png"),
				[`POST ${base64("logo")}`]: uploaded("https://i.imgur.com/logo.png"),
			};
			const { stdout } = await run([join(dir, "logo.png"), IMAGE_URL, join(dir, "photos")], { routes });
			assert.equal(
				stdout,
				[
					`${join(dir, "logo.png")}\thttps://i.imgur.com/logo.png`,
					`${IMAGE_URL}\thttps://i.imgur.com/url.png`,
					`${join(dir, "photos/a.png")}\thttps://i.imgur.com/a.png`,
					`${join(dir, "photos/b.png")}\thttps://i.imgur.com/b.png`,
					"",
				].join("\n"),
			);
		});
	});
});

describe("JPEG to PNG conversion", () => {
	test("converts a JPEG file to PNG before upload", async () => {
		await withFiles({}, async dir => {
			const jpegPath = await makeJpeg(dir, "photo.jpg");
			const jpegBytes = await readFile(jpegPath);
			const expectedPng = await sharp(jpegBytes).png().toBuffer();
			const { code, stdout, calls } = await run([jpegPath], {
				routes: { [`POST ${expectedPng.toString("base64")}`]: uploaded() },
			});
			assert.equal(code, 0);

			// The uploaded image should be a PNG, not the original JPEG bytes.
			const uploadedBytes = Buffer.from(calls[0].image, "base64");
			assert.ok(uploadedBytes.subarray(0, 4).equals(PNG_MAGIC), "uploaded image should start with PNG magic bytes");
			assert.notEqual(calls[0].image, base64(jpegBytes), "uploaded image should differ from original JPEG bytes");
		});
	});

	test("keeps a PNG file as PNG without conversion", async () => {
		await withFiles({}, async dir => {
			const pngPath = await makePng(dir, "image.png");
			const original = await readFile(pngPath);
			const { code, stdout, calls } = await run([pngPath], {
				routes: { [`POST ${base64(original)}`]: uploaded() },
			});
			assert.equal(code, 0);
			assert.equal(calls[0].image, base64(original), "PNG file should be uploaded unchanged");
		});
	});

	test("leaves non-JPEG, non-PNG files unchanged", async () => {
		await withFiles({}, async dir => {
			const gifPath = join(dir, "anim.gif");
			const gifBytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a header
			await writeFile(gifPath, gifBytes);
			const { code, stdout, calls } = await run([gifPath], {
				routes: { [`POST ${base64(gifBytes)}`]: uploaded() },
			});
			assert.equal(code, 0);
			assert.equal(calls[0].image, base64(gifBytes), "GIF file should be uploaded unchanged");
		});
	});
});

describe("demo", () => {
	const input = "https://example.com/photos/cat.jpeg?w=100&s=2";

	test("prints the input file name and the Imgur link", async () => {
		const { code, stdout } = await run([input], {
			script: DEMO,
			routes: { [`POST ${input}`]: uploaded("https://i.imgur.com/TtaUiZf.jpeg") },
		});
		assert.equal(code, 0);
		assert.equal(stdout, "input file: cat.jpeg\noutput url: https://i.imgur.com/TtaUiZf.jpeg\n");
	});

	test("prints the whole input when it has no file name", async () => {
		const noName = "https://example.com/image";
		const { stdout } = await run([noName], {
			script: DEMO,
			routes: { [`POST ${noName}`]: uploaded() },
		});
		assert.match(stdout, /^input file: https:\/\/example\.com\/image\n/);
	});

	test("fails when the link doesn't look like an Imgur image link", async () => {
		for (const link of ["https://example.com/abc.png", "https://i.imgur.com/abc"]) {
			const { code, stdout } = await run([input], {
				script: DEMO,
				routes: { [`POST ${input}`]: uploaded(link) },
			});
			assert.equal(code, 1);
			assert.equal(stdout, `input file: cat.jpeg\nFAIL: not an Imgur image link: ${link}\n`);
		}
	});

	test("fails when the upload fails", async () => {
		const { code, stdout } = await run([input], {
			script: DEMO,
			routes: { [`POST ${input}`]: rejected(429, "Too many requests") },
		});
		assert.equal(code, 1);
		assert.equal(stdout, "input file: cat.jpeg\nFAIL: Too many requests\n");
	});

	test("fails when the CLI rejects its arguments", async () => {
		const { code, stderr } = await run(["--nope"], { script: DEMO });
		assert.equal(code, 1);
		assert.match(stderr, /Unknown option: --nope/);
	});
});

describe("multiple inputs", () => {
	const good = "https://example.com/good.png";
	const bad = "https://example.com/bad.png";
	const partialFailure = {
		[`POST ${good}`]: uploaded("https://i.imgur.com/good.png"),
		[`POST ${bad}`]: rejected(429, "Too many requests"),
	};

	test("a failure doesn't stop the others, and exits 1", async () => {
		const { code, stdout } = await run([bad, good], { routes: partialFailure });
		assert.equal(code, 1);
		// The failed upload is retried after the others, so it's printed last.
		assert.equal(stdout, `${good}\thttps://i.imgur.com/good.png\n${bad}\tERROR: Too many requests\n`);
	});

	test("--json reports an imgur or error field for each input, and exits 1", async () => {
		const { code, stdout } = await run(["--json", good, bad], { routes: partialFailure });
		assert.equal(code, 1);
		assert.deepEqual(JSON.parse(stdout), [
			{ input: good, imgur: "https://i.imgur.com/good.png" },
			{ input: bad, error: "Too many requests" },
		]);
	});

	test("results keep input order when uploads finish out of order", async () => {
		const routes = {
			"POST https://example.com/slow.png": { ...uploaded("https://i.imgur.com/slow.png"), delay: 150 },
			"POST https://example.com/fast.png": uploaded("https://i.imgur.com/fast.png"),
		};
		const { stdout } = await run(["https://example.com/slow.png", "https://example.com/fast.png"], { routes });
		assert.equal(
			stdout,
			"https://example.com/slow.png\thttps://i.imgur.com/slow.png\n" +
				"https://example.com/fast.png\thttps://i.imgur.com/fast.png\n",
		);
	});

	test("uploads one at a time, and uploads every input", async () => {
		const urls = Array.from({ length: 10 }, (_, index) => `https://example.com/${index}.png`);
		const routes = Object.fromEntries(urls.map(url => [`POST ${url}`, { ...uploaded(), delay: 25 }]));
		const { code, stdout, calls } = await run(urls, { routes });
		assert.equal(code, 0);
		assert.equal(stdout.trimEnd().split("\n").length, urls.length);
		assert.equal(calls.length, urls.length);
		assert.equal(Math.max(...calls.map(call => call.inFlight)), 1);
	});

	test("prints progress for each upload to stderr, leaving stdout unchanged", async () => {
		const { code, stdout, stderr } = await run([good, bad], { routes: partialFailure });
		assert.equal(code, 1);
		assert.equal(stdout, `${good}\thttps://i.imgur.com/good.png\n${bad}\tERROR: Too many requests\n`);
		assert.deepEqual(stderr.split("\n").slice(0, 7), [
			`[1/2] Uploading ${good}`,
			`[2/2] Uploading ${bad}`,
			"[2/2] Failed, will retry: Too many requests",
			`Retry 1/3 [1/1]: waiting 0s, then uploading ${bad}`,
			`Retry 2/3 [1/1]: waiting 0s, then uploading ${bad}`,
			`Retry 3/3 [1/1]: waiting 0s, then uploading ${bad}`,
			"Done: 1 uploaded, 1 failed",
		]);
	});
});

describe("retries", () => {
	const a = "data:image/png;base64,QQ==";
	const b = "data:image/png;base64,Qg==";
	const c = "data:image/png;base64,Qw==";
	const key = url => `POST ${url.split(",")[1]}`;

	const retryable = {
		"429": rejected(429, "Too many requests"),
		"503 over capacity": rejected(503, "Imgur is temporarily over capacity. Please try again later."),
		"a non-JSON 502": { status: 502, body: "<html>Bad gateway</html>" },
		"a network error": { networkError: "fetch failed" },
	};
	for (const [name, failure] of Object.entries(retryable)) {
		test(`retries after ${name} and succeeds`, async () => {
			const { code, stdout, calls } = await run([a], {
				routes: { [key(a)]: [failure, uploaded("https://i.imgur.com/a.png")] },
			});
			assert.equal(code, 0);
			assert.equal(stdout, `${a}\thttps://i.imgur.com/a.png\n`);
			assert.equal(calls.length, 2);
		});
	}

	test("gives up after 3 retries", async () => {
		const { code, stdout, calls } = await run([a], { routes: { [key(a)]: rejected(503, "HTTP 503") } });
		assert.equal(code, 1);
		assert.equal(stdout, `${a}\tERROR: HTTP 503\n`);
		assert.equal(calls.length, 4);
	});

	test("doesn't retry an image Imgur rejects", async () => {
		const { code, calls } = await run([a], { routes: { [key(a)]: rejected(400, "Bad image") } });
		assert.equal(code, 1);
		assert.equal(calls.length, 1);
	});

	test("retries only the failures, one at a time, in input order, after waiting", async () => {
		const routes = {
			[key(a)]: [rejected(429, "Too many requests"), uploaded("https://i.imgur.com/a.png")],
			[key(b)]: uploaded("https://i.imgur.com/b.png"),
			[key(c)]: [rejected(503, "HTTP 503"), rejected(503, "HTTP 503"), uploaded("https://i.imgur.com/c.png")],
		};
		const started = Date.now();
		const { code, stdout, stderr, calls, clipboard } = await run([a, b, c], {
			routes,
			env: { SHARE_IMG_RETRY_DELAY_MS: "40" },
		});
		assert.equal(code, 0);
		// Two waits in round 1 (40ms each) and one in round 2 (80ms).
		assert.ok(Date.now() - started >= 160);
		assert.deepEqual(calls.map(call => call.key), [key(a), key(b), key(c), key(a), key(c), key(c)]);
		assert.equal(Math.max(...calls.map(call => call.inFlight)), 1);
		assert.equal(
			stdout,
			`${b}\thttps://i.imgur.com/b.png\n${a}\thttps://i.imgur.com/a.png\n${c}\thttps://i.imgur.com/c.png\n`,
		);
		assert.match(stderr, /^Retry 1\/3 \[2\/2\]: waiting 0\.04s, then uploading data:/m);
		assert.match(stderr, /^Retry 2\/3 \[1\/1\]: waiting 0\.08s, then uploading data:/m);
		assert.match(stderr, /^Done: 3 uploaded, 0 failed$/m);
		if (process.platform !== "win32") {
			// The clipboard keeps input order even though the retried links finished last.
			assert.equal(clipboard, "https://i.imgur.com/a.png\nhttps://i.imgur.com/b.png\nhttps://i.imgur.com/c.png");
		}
	});
});

// The fake clipboard commands are shell scripts, which Windows can't run.
describe("clipboard", { skip: process.platform === "win32" }, () => {
	const routes = { [`POST ${IMAGE_URL}`]: uploaded() };
	const line = `${IMAGE_URL}\thttps://i.imgur.com/abc.png\n`;

	test("copies only the Imgur link and leaves stdout unchanged", async () => {
		const { code, stdout, stderr, clipboard } = await run([IMAGE_URL], { routes });
		assert.equal(code, 0);
		assert.equal(clipboard, "https://i.imgur.com/abc.png");
		assert.equal(stdout, line);
		assert.match(stderr, /^Copied to clipboard$/m);
	});

	test("copies only the Imgur link with --json", async () => {
		const { stdout, clipboard } = await run(["--json", IMAGE_URL], { routes });
		assert.equal(clipboard, "https://i.imgur.com/abc.png");
		assert.deepEqual(JSON.parse(stdout), [{ input: IMAGE_URL, imgur: "https://i.imgur.com/abc.png" }]);
	});

	test("copies one link per line in input order and leaves out failed uploads", async () => {
		const { code, clipboard } = await run(
			["https://example.com/slow.png", "https://example.com/bad.png", "https://example.com/fast.png"],
			{
				routes: {
					"POST https://example.com/slow.png": { ...uploaded("https://i.imgur.com/slow.png"), delay: 100 },
					"POST https://example.com/bad.png": rejected(429, "Too many requests"),
					"POST https://example.com/fast.png": uploaded("https://i.imgur.com/fast.png"),
				},
			},
		);
		assert.equal(code, 1);
		assert.equal(clipboard, "https://i.imgur.com/slow.png\nhttps://i.imgur.com/fast.png");
	});

	test("leaves the clipboard alone when every upload fails", async () => {
		const { code, stderr, clipboard } = await run([IMAGE_URL], {
			routes: { [`POST ${IMAGE_URL}`]: rejected(429, "Too many requests") },
		});
		assert.equal(code, 1);
		assert.equal(clipboard, null);
		assert.doesNotMatch(stderr, /clipboard/);
	});

	const unavailable = {
		"is not installed": { PATH: "/nonexistent" },
		"fails": { FAKE_CLIPBOARD_FAIL: "1" },
	};
	for (const [name, env] of Object.entries(unavailable)) {
		test(`warns and still succeeds when the clipboard command ${name}`, async () => {
			const { code, stdout, stderr, clipboard } = await run([IMAGE_URL], { routes, env });
			assert.equal(code, 0);
			assert.equal(clipboard, null);
			assert.equal(stdout, line);
			assert.match(stderr, /^Couldn't copy to clipboard$/m);
		});
	}
});
