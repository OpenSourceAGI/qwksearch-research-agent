# Storybook — `research-agent-ui`

This package ships a [Storybook](https://storybook.js.org/) so every UI
element can be developed, reviewed, and tested in isolation — no live API,
auth session, or chat backend required. All stories render against **mock data
only**.

- Storybook version: **9.x** (`@storybook/react-vite`)
- Config: [`.storybook/main.ts`](.storybook/main.ts),
  [`.storybook/preview.tsx`](.storybook/preview.tsx)
- Shared fixtures: [`src/stories/mocks.ts`](src/stories/mocks.ts)
- Stories live next to their components as `src/**/*.stories.tsx`

---

## Running it locally

From this package (`packages/research-agent-ui`):

```bash
# install workspace deps once, from the repo root
pnpm install        # or: bun install / npm install

# start Storybook with hot reload on http://localhost:6006
pnpm storybook      # → runs `storybook dev -p 6006`
```

The preview toolbar has a **Theme** switch (light / dark) that toggles the
`.dark` class so you can verify both palettes. Every story is wrapped in a
Radix `TooltipProvider`, so tooltip-bearing components work standalone.

### What has stories

| Area | Examples |
| --- | --- |
| **UI primitives** (`src/ui`) | `Button`, `Badge`, `Loader`, `Tooltip`, `Dialog`, `DropdownMenu`, `Popover`, `LiveWaveform`, `GlowingEffect`, `VisuallyHidden` |
| **Article reader** | `ArticleActionButtons`, `ArticleAIResponse`, `ArticleFollowupQuestions`, `ArticlePromptInput`, `ArticlePanelHeader` |
| **Chat** | `MessageReasoningPanel`, `ThinkTagProcessor`, `SearchProgressIndicator`, `FollowUpSuggestions`, `UserMessageHeader` |
| **Actions & results** | `CopyMessageButton`, `WebCitationBadge`, `HistoryChatItem` |
| **File upload / composer** | `FilePreviewCard`, `PastedContentCard` |
| **Misc** | `ConfigError`, `Footer` |

Container components that require a live `ChatProvider` / `SessionProvider` or
network access (e.g. `ChatWindow`, `ModelSelector`, `VoiceSettingsPanel`) are
intentionally **not** storied — they are composed from the individual elements
above, which are.

---

## Writing a new story

Colocate a `*.stories.tsx` file next to the component and follow the existing
convention:

```tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';           // spy for callback args
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Area/MyComponent',                    // groups it in the sidebar
  component: MyComponent,
  args: { onClick: fn() },                       // default args for all stories
};
export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {};
export const Variant: Story = { args: { variant: 'secondary' } };
```

Guidelines:

- **Mock, don't call.** Reuse fixtures from `src/stories/mocks.ts`; add new
  ones there so they're shared. Never hit a real API from a story.
- **Callbacks** use `fn()` from `storybook/test` so clicks are logged in the
  **Actions** panel.
- **Components that need a context provider** (e.g. `useExtractPanel`) should
  wrap the story in that provider via a `decorators` array — see
  `WebCitationBadge.stories.tsx`.
- Prefer several small, named stories (one per state) over one story with many
  controls.

---

## Testing the stories

### 1. Type-check

Stories are type-checked with the rest of the package:

```bash
pnpm type-check      # tsc --noEmit
```

A story that passes props the component doesn't accept fails here.

### 2. Interaction tests (play functions)

Storybook 9 bundles a test API (`storybook/test`) built on Testing Library.
Add a `play` function to script and assert on interactions; it runs in the
**Interactions** panel as you view the story:

```tsx
import { expect, fn, userEvent, within } from 'storybook/test';

export const CopiesOnClick: Story = {
  args: { onCopyClick: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /copy/i }));
    await expect(args.onCopyClick).toHaveBeenCalled();
  },
};
```

### 3. Run every story headlessly (test runner)

The [test runner](https://storybook.js.org/docs/writing-tests/test-runner)
renders each story in a headless browser, fails on any render error or console
error, and executes every `play` function. It is not installed by default — add
it when you want CI coverage:

```bash
pnpm add -D @storybook/test-runner
```

```jsonc
// package.json → scripts
"test-storybook": "test-storybook"
```

```bash
# Terminal A: serve Storybook
pnpm storybook

# Terminal B: run the tests against it
pnpm test-storybook
```

> This environment ships Chromium at `/opt/pw-browsers`. Set
> `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` and do **not** run
> `playwright install` — the browser is already present.

In CI, run it against a built Storybook so nothing has to stay running:

```bash
pnpm build-storybook --quiet
npx concurrently -k -s first -n SB,TEST \
  "npx http-server storybook-static --port 6006 --silent" \
  "npx wait-on tcp:6006 && pnpm test-storybook --url http://127.0.0.1:6006"
```

### 4. Accessibility checks (optional)

Add the a11y addon to surface WCAG violations per story in the **Accessibility**
panel (and fail the test runner on violations):

```bash
pnpm add -D @storybook/addon-a11y
```

```ts
// .storybook/main.ts
addons: ['@storybook/addon-a11y'],
```

---

## Hosting it live

`build-storybook` produces a fully static site in `storybook-static/` that any
static host can serve:

```bash
pnpm build-storybook          # → storybook-static/
```

Pick one of the following to publish it.

### GitHub Pages (free, in-repo)

Add a workflow that builds this package's Storybook and deploys the static
output to Pages:

```yaml
# .github/workflows/storybook.yml
name: Publish Storybook
on:
  push:
    branches: [master]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter research-agent-ui build-storybook
      - uses: actions/upload-pages-artifact@v3
        with:
          path: packages/research-agent-ui/storybook-static
      - id: deploy
        uses: actions/deploy-pages@v4
```

Enable **Settings → Pages → Source: GitHub Actions** once; every push to
`master` then republishes to `https://<org>.github.io/<repo>/`.

### Chromatic (free tier, adds visual regression)

[Chromatic](https://www.chromatic.com/) is built by the Storybook team and
also snapshots every story for visual-diff review on each PR:

```bash
pnpm add -D chromatic
npx chromatic --project-token=<token>        # prints the published URL
```

### Cloudflare Pages

This repo already uses Cloudflare (`wrangler`). Deploy the static build
directly:

```bash
pnpm build-storybook
npx wrangler pages deploy storybook-static --project-name qwksearch-storybook
```

Or, in the Cloudflare Pages dashboard, set **Build command** to
`pnpm --filter research-agent-ui build-storybook` and **Output directory** to
`packages/research-agent-ui/storybook-static`.

### Vercel / Netlify

Any static host works. For Vercel:

```bash
pnpm build-storybook
npx vercel deploy storybook-static --prod
```

For Netlify, set the build command to
`pnpm --filter research-agent-ui build-storybook` and the publish directory to
`packages/research-agent-ui/storybook-static`.

---

## Quick reference

| Task | Command |
| --- | --- |
| Dev server | `pnpm storybook` |
| Static build | `pnpm build-storybook` |
| Type-check stories | `pnpm type-check` |
| Headless test all stories | `pnpm test-storybook` *(after adding the runner)* |
| Deploy static output | serve / upload `storybook-static/` |
