<p align="center">
    <img  src="https://i.imgur.com/oU9bkeX.png" />
    <a href="https://1computer.online/docs/packages/share-image"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/dm/share-img.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/v/share-img.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/dt/share-img.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/types/share-img" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=share-img"><img src="https://packagephobia.com/badge?p=share-img" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/share-image"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://1computer.online/docs/packages/share-image"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/dm/share-img.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/v/share-img.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/dt/share-img.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/share-img"><img src="https://img.shields.io/npm/types/share-img" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=share-img"><img src="https://packagephobia.com/badge?p=share-img" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/dev-tools-starter-agent/tree/master/packages/share-image"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" />
</p>
<!-- template-git-repo:badges:end -->

<!-- template-git-repo:badges:end -->

# share-img

Upload one or many images to Imgur by URL, file or folder and get the Imgur link for each one. No Imgur account or setup needed. Requires Node 18 or later.

JPEG (`.jpg`, `.jpeg`) files are converted to PNG before uploading. PNG files stay PNG — nothing is ever converted to JPEG.

## Install

Run it without installing:

```sh
npx share-img https://compote.slate.com/images/b136d0ff-db57-4a8b-9a3b-b280e373f27f.jpeg?crop=1560%2C1040%2Cx0%2Cy0&s=image-1170
```

Or install the command globally:

```sh
npm install -g share-img
```

## Usage

Pass one or more URLs, files or folders, or a JSON array of them:

```sh
share-img https://example.com/a.png
share-img https://example.com/a.png https://example.com/b.jpg
share-img '["https://example.com/a.png", "https://example.com/b.jpg"]'
share-img ./logo.png
share-img ./photos
```

`http`, `https` and `data:` (base64) image URLs are accepted.

### Uploading a folder

A folder is searched for images, including in all its subfolders. The images are then uploaded one at a time, and each result shows the file's path as soon as it's done:

```
$ share-img ./photos
Scanning ./photos for images...
Found 2 images in ./photos
[1/2] Uploading photos/a.png
photos/a.png	https://i.imgur.com/xxxxxxx.png
[2/2] Uploading photos/trips/b.jpg
photos/trips/b.jpg	https://i.imgur.com/yyyyyyy.jpg
Done: 2 uploaded, 0 failed
Copied to clipboard
```

The `Scanning`, `Found`, `[n/total] Uploading` and `Done` lines are progress, printed to stderr. Only the result lines go to stdout, so piping the output still gives you just the results.

- **Every image found is uploaded publicly, and this tool can't delete uploads.** Check what's in a folder before you point the tool at it.
- These file types are included: `apng`, `bmp`, `gif`, `heic`, `jpeg`, `jpg`, `png`, `svg`, `tif`, `tiff` and `webp`. JPEG files are converted to PNG before uploading; PNG files stay PNG. Imgur may still reject some types, which shows up as an error for that file.
- Hidden files and folders and symlinks are skipped.
- A folder with no images counts as a failed upload.

### Options

| Option | Description |
| --- | --- |
| `--json` | Print results as a JSON array |
| `-h`, `--help` | Show help |

### Environment variables

| Variable | Description |
| --- | --- |
| `IMGUR_CLIENT_ID` | Imgur API client ID to use instead of the built-in one |
| `IMGUR_CLIENT_SECRET` | Imgur API client secret to use instead of the built-in one |

## Output

Results are printed in input order as each image finishes. An image that needed a retry is printed once its retry finishes, after the others. Each line is the input URL, a tab, then the Imgur link:

```
https://example.com/a.png	https://i.imgur.com/xxxxxxx.png
https://example.com/b.jpg	ERROR: Too many requests
```

With `--json`, each result has either an `imgur` or an `error` field:

```json
[
  { "input": "https://example.com/a.png", "imgur": "https://i.imgur.com/xxxxxxx.png" },
  { "input": "https://example.com/b.jpg", "error": "Too many requests" }
]
```

A failed upload doesn't stop the others.

### Retries

When an upload fails with a timeout, a network error, a rate limit (`429`) or an Imgur server error (`5xx`, including "Imgur is temporarily over capacity"), it's retried after the other images have been tried. Each failed image is retried up to 3 more times. The retries run one at a time, and each round waits longer before every upload: 2 seconds, then 4, then 8. Progress for each retry goes to stderr:

```
[3/3] Failed, will retry: HTTP 429
Retry 1/3 [1/1]: waiting 2s, then uploading photos/c.png
photos/c.png	https://i.imgur.com/zzzzzzz.png
```

Errors that would fail the same way again aren't retried, such as an image Imgur rejects, a file that can't be read, or a `401` or `403`. `--json` output and the clipboard keep input order whether or not an image was retried.

### Clipboard

The Imgur links are also copied to your clipboard, without the input paths or any error lines. Several links are copied one per line, and this works with `--json` too. The clipboard isn't changed if every upload fails.

The copy uses `pbcopy` on macOS, `clip` on Windows, and `wl-copy` or `xclip` on Linux. A `Copied to clipboard` or `Couldn't copy to clipboard` message goes to stderr, so it won't end up in piped output, and a failed copy doesn't change the exit code.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | All images uploaded |
| `1` | At least one upload failed |
| `2` | Invalid arguments |

### Using the output in a script

Print only the Imgur links:

```sh
share-img https://example.com/a.png https://example.com/b.jpg | cut -f2
```

The same with `--json` and [jq](https://jqlang.github.io/jq/):

```sh
share-img --json https://example.com/a.png | jq -r '.[].imgur'
```

## Testing

Run the test suite. It mocks every request, so nothing is uploaded and no network is needed:

```sh
npm test
```

Upload a sample image with your local copy of the CLI, or pass your own URLs, files or folders:

```sh
bun demo
npm run demo -- ./logo.png
```

This prints the name of each input file and its Imgur link, and exits with `1` if an upload fails or the link doesn't look like an Imgur image link:

```
input file: logo.png
output url: https://i.imgur.com/xxxxxxx.png
```

This makes a real, public upload to Imgur, and it can't be deleted with this tool.

## How it works

Images upload one at a time, in input order. Imgur first tries to fetch each URL itself. If it can't, the image is downloaded on your machine and sent to Imgur directly, which helps with hosts that block Imgur. This retry is skipped on `401`, `403` and `429` responses, since sending the image again wouldn't help.

Each request times out after 60 seconds, and a timed-out upload is retried as described in [Retries](#retries).

## Good to know

- **Uploads are anonymous.** Images aren't linked to an Imgur account, and login and albums aren't supported.
- **Anyone with the link can view an image.** Don't upload anything private.
- **You can't delete uploads with this tool.** It doesn't output the delete hash that Imgur returns.
- **The default client ID is shared.** All users of the built-in ID share its rate limit, so `429` errors can happen even at low volume. For regular use, [register your own client ID](https://api.imgur.com/oauth2/addclient) and set `IMGUR_CLIENT_ID`.
