# Repository tools

Run commands from the repository root with Node.js 22 or newer.

| Command | Purpose |
| --- | --- |
| `npm run build` | Bundle the injected switcher and record source hashes. |
| `npm run check` | Check extension syntax, assets, entry points and bundle freshness. |
| `npm run package` | Create the Chrome upload ZIP and file inventory in `output/`. |
| `npm run test:browser -- --list` | List the [browser regression scenarios](../tests/browser/README.md). |
| `npm run docs:check` | Check documentation links and guide coverage. |
| `npm run site:build` | Build website pages and shared Markdown guides into `output/site/`. |
| `npm run site:check` | Check generated links, assets and canonical URLs. |

`guide-markdown.mjs` renders the shared user guides for the website. Edit the Markdown in `docs/`, then rebuild; do not edit generated guide HTML. See the [website README](../website/README.md) for preview and publication.

To regenerate extension icons after changing `extension/icons/lion.svg`, run `node scripts/icons.mjs --sharp=/path/to/sharp`. The optional [Sharp](https://sharp.pixelplumbing.com/install/) dependency is needed only for icon generation.

Browser cases belong in `tests/browser/`; unit tests belong in `tests/`. Keep generated files, profiles and diagnostic reports in ignored `output/`. See the [project README](../README.md) for development and contribution guidance.
