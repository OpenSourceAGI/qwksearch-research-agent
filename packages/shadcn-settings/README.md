<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/shadcn-settings"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <br />
    <a href="https://www.npmjs.com/package/shadcn-settings"><img src="https://img.shields.io/npm/dm/shadcn-settings.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/shadcn-settings"><img src="https://img.shields.io/npm/v/shadcn-settings.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/shadcn-settings"><img src="https://img.shields.io/npm/dt/shadcn-settings.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/shadcn-settings"><img src="https://img.shields.io/npm/types/shadcn-settings" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=shadcn-settings"><img src="https://packagephobia.com/badge?p=shadcn-settings" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

# shadcn-settings

[![Coverage](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent/graph/badge.svg?component=package-shadcn-settings)](https://codecov.io/gh/OpenSourceAGI/qwksearch-research-agent)

Schema-driven **settings form renderer** for React, built on
[shadcn/ui](https://ui.shadcn.com) + Radix primitives.

Describe your settings as plain data (typically JSON), hand the list to
`<SettingsList />` with `getValue` / `onCommit` callbacks, and it renders the
controls for you — no per-field JSX. It knows nothing about *where* your values
live (localStorage, an API, a config file), so the same schema drives
rendering, persistence and search independently.

- **Field variants** — `string`, `password` (show/hide), `textarea`, `select`,
  `switch`.
- **Layout variants** — `card`, `inline`, `ghost` per field.
- **Bring your own types** — inject extra `renderers` (e.g. a `theme` picker)
  or override a built-in.
- **Optimistic + async commits** — edits fire `onChange` immediately and
  `onCommit` on blur/change; async commits show a spinner automatically.
- **Style-agnostic** — ships shadcn token defaults, and every slot accepts a
  `classNames` override so it matches your app's design.

## Install

```bash
npm install shadcn-settings
# peer deps: react, react-dom
```

Uses shadcn/ui theme tokens (`--border`, `--card`, `--primary`,
`--muted-foreground`, …). If your app already uses shadcn/ui, no extra setup is
needed.

## Quick start

```tsx
import { SettingsList, type SettingsFieldSchema } from "shadcn-settings";

const fields: SettingsFieldSchema[] = [
  {
    name: "Background Art",
    key: "showBackgroundArt",
    type: "switch",
    description: "Show a random artistic background on the homepage.",
    default: true,
  },
  {
    name: "SearXNG URL",
    key: "searxngURL",
    type: "string",
    placeholder: "http://localhost:4000",
  },
];

export function Settings() {
  return (
    <SettingsList
      fields={fields}
      getValue={(field) => localStorage.getItem(field.key) ?? field.default}
      onCommit={(field, value) =>
        localStorage.setItem(field.key, String(value))
      }
    />
  );
}
```

## Schema

Each entry is a `SettingsFieldSchema`:

| key           | type                                        | notes                                   |
| ------------- | ------------------------------------------- | --------------------------------------- |
| `name`        | `string`                                    | Label                                   |
| `key`         | `string`                                    | Persistence key / React key             |
| `type`        | `"string" \| "password" \| "textarea" \| "select" \| "switch"` | or a custom type you register |
| `description` | `string?`                                   | Helper text                             |
| `placeholder` | `string?`                                   | Text inputs                             |
| `default`     | `string \| boolean?`                        | Used when the value is `undefined`      |
| `options`     | `{ name, value }[]?`                        | `select` only                           |
| `links`       | `{ name, url }[]?`                           | Reference links under the description   |

Extra keys (`scope`, `env`, …) pass through untouched, so you can carry your own
metadata on each field.

## Rendering a single field

```tsx
import { SettingsField } from "shadcn-settings";

<SettingsField field={field} value={value} onCommit={save} variant="inline" />;
```

## Custom / overriding field types

Pass a `renderers` map. The special `"unknown"` key replaces the fallback used
for unregistered types.

```tsx
<SettingsList
  fields={fields}
  getValue={getValue}
  onCommit={onCommit}
  renderers={{
    theme: ({ field, value, onCommit }) => (
      <MyThemePicker value={value} onChange={onCommit} label={field.name} />
    ),
  }}
/>
```

A custom renderer receives `SettingsFieldRenderProps`: `field`, `value`,
`onChange`, `onCommit`, `variant`, `anchorId`, `titleAddon`, `classNames`,
`disabled`.

## Matching your design

Every field accepts `classNames` overrides:

```tsx
<SettingsList
  /* … */
  variant="card"
  classNames={{
    root: "rounded-xl border-light-200 bg-light-primary/80 dark:border-dark-200",
    title: "text-black dark:text-white",
    description: "text-black/50 dark:text-white/50",
  }}
/>
```

Slots: `root`, `header`, `title`, `description`, `control`.

## API

- `SettingsList` — renders an ordered schema. Props: `fields`, `getValue`,
  `onCommit`, `onChange?`, `variant?`, `renderers?`, `anchorId?`,
  `renderTitleAddon?`, `classNames?`, `className?`.
- `SettingsField` — renders one field; dispatches on `field.type`.
- `FieldShell` — the label/description/control chrome, if you build a field
  from scratch.
- `StringField`, `PasswordField`, `TextareaField`, `SelectField`,
  `SwitchField` — the individual variants.
- `Select*`, `Switch` — the underlying shadcn/ui primitives.
- `useCommit` — the async-commit-with-spinner hook.

## License

rights.institute/PROSPER
