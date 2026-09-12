<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# QwkSearch Tab Manager AI

A browser extension (Chrome and Firefox) that turns the sidebar into a tab
manager and a research assistant over whatever you have open.

- Vertical tabs sidebar with sorting and a context menu
- Search inside the page content of every open tab
- Select text, press <kbd>Tab</kbd> to search; <kbd>Tab</kbd> again opens the first result
- Reader mode that extracts and cites the main content (PDF and YouTube included)
- Ask AI about the text of open and saved tabs

Open the side panel with <kbd>Ctrl</kbd>+<kbd>Q</kbd>
(<kbd>Cmd</kbd>+<kbd>B</kbd> on macOS).

### Screenshot

<img src="https://i.imgur.com/JC1qiRd.png">

## How it is built

[WXT](https://wxt.dev) over Vite and React 19. The UI is
`packages/research-agent-ui` — the same components the web app renders —
compiled here through two shims in `lib/`, because an extension has neither
Next.js nor a local server:

| Shim | Why |
| --- | --- |
| `lib/next-navigation-shim.tsx` | `research-agent-ui` imports `next/navigation`, which does not exist outside Next.js. |
| `lib/grab-url-shim.ts` | Its components call relative paths like `/api/agent/providers`. The shim rewrites anything starting with `/` onto `https://qwksearch.com`. |

`wxt.config.ts` also re-escapes non-ASCII bytes in the content-script bundle
after Vite's minifier converts `\uXXXX` back to literal characters — Chrome
rejects content scripts that contain them.

## Setup

```bash
bun install                 # from the repo root
cd apps/qwksearch-ext

bun run dev                 # Chrome, with a live-reloading dev profile
bun run dev:firefox         # Firefox
bun run test                # vitest
bun run compile             # tsc --noEmit
```

`wxt dev` launches a browser with the extension already loaded — there is no
"load unpacked" step while developing. To load a built extension by hand
instead: `bun run build`, then `chrome://extensions` → Developer mode → **Load
unpacked** → `.output/chrome-mv3`.

## Configuration

**This extension reads no environment variables** — there is no `.env`, and no
API key ships in the bundle. Two things stand in for configuration:

| What | Where | Default |
| --- | --- | --- |
| The API host every `/api/*` call is rewritten onto | `API_BASE` in [`lib/grab-url-shim.ts`](./lib/grab-url-shim.ts) | `https://qwksearch.com` |
| Permissions, keyboard command, search provider, CSP | `manifest` in [`wxt.config.ts`](./wxt.config.ts) | see below |

Point `API_BASE` at `http://localhost:3000` to develop against a local
`apps/qwksearch-web`. Everything the API itself needs — model keys, auth, search
providers — is configured on that deployment; see
[its README](../qwksearch-web/README.md#environment-variables).

The manifest asks for `<all_urls>` host permissions and a wide permission set
(`tabs`, `history`, `bookmarks`, `sessions`, `downloads`, `scripting`,
`declarativeNetRequest`, `offscreen`, …). Both stores review those closely, so
removing one you no longer use is worth doing before a submission rather than
after a rejection. On Chrome the manifest also overrides the homepage, startup
page and default search provider; Firefox does not support that subset, so it
is applied only when `env.browser === 'chrome'`.

## Building and publishing

```bash
bun run build              # → .output/chrome-mv3/
bun run build:firefox      # → .output/firefox-mv2/
bun run zip                # → .output/*.zip, ready to upload
bun run zip:firefox
```

Bump `version` in **both** `package.json` and the `manifest` block of
`wxt.config.ts` — WXT does not derive one from the other, and a store rejects
an upload whose version is not higher than the last.

| Store | Upload | What you need |
| --- | --- | --- |
| Chrome Web Store | [Developer Dashboard](https://chrome.google.com/webstore/devconsole) | A developer account (one-time $5 registration fee) and the `chrome-mv3` zip. |
| Firefox Add-ons | [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) | A Mozilla account and the `firefox-mv2` zip. Source must be submitted alongside the build, since the bundle is generated. |

Both stores want a privacy policy URL for an extension with these permissions.
Neither upload needs a secret in this repository — they are interactive, and
nothing here automates them.

## Ideas for Future Development

- Paste from clipboard and search
- Tree tab view and history view
- AI recommend [Tab Groups](https://developer.chrome.com/docs/extensions/reference/tabGroups/) (Chrome AI Experiments has [similar feature](https://support.google.com/chrome/answer/14519765?hl=en) it's their main [AI use](https://www.google.com/chrome/ai-innovations/))
- Backup & close a read-it-later list
- Voice Ask with Whisper in WebGPU to Search
- Show current url & title when in full screen
- Search in text of recently closed history
- Crowdsourced bookmarking of topic outlines and keywords
