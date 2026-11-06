# use-weather-forecast site: docs, live demo and Storybook

The documentation site, the live demo and the Storybook for the
[`use-weather-forecast`](..) npm package, as one Next.js app deployed to
**Vercel**. [Fumadocs](https://fumadocs.dev) for the docs, set up the same way
as `packages/extract-pdf/site`.

| Path | What |
| --- | --- |
| `/` | Landing page, with the visitor's own weather in the compact card. |
| `/docs/*` | Getting started, variants (with previews), props, hooks and API, reliability, location and caching. |
| `/demo` | Playground: every prop as a control, live Open-Meteo data or sample data, and the JSX to copy. |
| `/storybook/` | Every component variant with controls and autodocs (redirects to `/storybook/index.html`). |
| `/docs/llms-full.txt`, `/docs/<page>.mdx` | The docs as Markdown for LLMs. |

It installs the **published** `use-weather-forecast` from npm, not the
workspace source, so the demo shows exactly what users install. A package
change reaches the site after `npm-publish.yml` publishes it and Vercel
rebuilds; bump the range in `package.json` to force that. The site is not a
Bun workspace and is not published (`private: true`).

## Vercel

Create a Vercel project from this repository with **Root Directory** set to
`packages/react-weather-forecast/site`. Everything else comes from
`vercel.json`: `install-vercel-deps.sh` runs `npm install` pinned to this
directory (so npm ignores the monorepo's `workspace:*` deps), and
`npm run build` builds Storybook into `public/storybook` and then runs
`next build`. No environment variables are needed. Every push to `master`
that Vercel's Git integration sees then redeploys it.

## Commands

```bash
./install-vercel-deps.sh   # or: npm install --prefix "$PWD"
npm run dev                # next dev: docs and /demo (Storybook not included)
npm run storybook          # Storybook dev server on :6006
npm run build              # build-storybook → public/storybook, then next build
npm run start              # serve the build, /storybook/ included
npm run typecheck
```

## Where things live

| Path | What |
| --- | --- |
| `content/docs/*.mdx` | The pages; order in `meta.json`. `<WeatherPreview />` renders the widget inline (see below). |
| `lib/fixtures.ts` | Sample forecasts as custom `weatherProviders`, shared by Storybook, the docs previews and the demo's "Sample data" mode. Each scenario has its own coordinates, because the forecast cache is keyed by place, not provider. |
| `components/demo/WeatherPlayground.tsx` | `/demo`. |
| `components/demo/WeatherPreview.tsx` | The docs' inline widget. MDX renders on the server and cannot pass a provider function to a client component, so it takes plain props. |
| `stories/` | Storybook: `WeatherForecast/Variants` (sample data), `WeatherForecast/Live` (real APIs), `WeatherIcon`, `useWeatherForecast`. |
| `lib/fumadocs/customize-docs.ts` | Site title and links. |

`jszip` is a dependency only because `grab-url` (the package's HTTP client)
imports it from a lazily loaded helper without declaring it, and both Vite
(Storybook) and Turbopack resolve that import at build time.
