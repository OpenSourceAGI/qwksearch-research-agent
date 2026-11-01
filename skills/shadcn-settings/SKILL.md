---
name: ask-shadcn-settings
description: Guide to shadcn-settings (packages/shadcn-settings), the schema-driven settings form renderer for shadcn/ui — the SettingsList component, the plain-data SettingsFieldSchema, the built-in string/password/textarea/select/switch renderers, custom field types via the renderers map, the card/inline/ghost layout variants, getValue/onCommit/onChange, and the useCommit spinner hook. Use when adding a settings field or a custom control, when a value doesn't persist or the spinner never clears, or when matching the form to a host app's design.
---

# Working With shadcn-settings

`packages/shadcn-settings`, published as **shadcn-settings**. Give it a list of plain
field declarations and two callbacks; it renders the controls. It stores nothing — the
host owns where values live (localStorage, an API, a config manager).

## Setup

```tsx
import { SettingsList } from "shadcn-settings";

<SettingsList
  fields={[
    { key: "apiKey", name: "API key", type: "password", description: "…",
      links: [{ name: "Get one", url: "https://…" }] },
    { key: "model", name: "Model", type: "select",
      options: [{ name: "Fast", value: "fast" }], default: "fast" },
    { key: "stream", name: "Stream", type: "switch", default: true },
  ]}
  getValue={(f) => store[f.key]}
  onCommit={async (f, v) => { await save(f.key, v); }}
  variant="card"
/>
```

Peers: `react`, `react-dom`. Tailwind + shadcn tokens are assumed by the class names.

## Fields

`SettingsFieldSchema` is **plain data**, deliberately JSON-serialisable, so the same
list can drive rendering, persistence and search:

| Key | Notes |
| --- | --- |
| `key` | Stable id — persistence key and React key |
| `name` | Label |
| `type` | `"string"`, `"password"`, `"textarea"`, `"select"`, `"switch"`, or your own |
| `description` | Helper text under the label |
| `placeholder`, `default` | |
| `options` | `{ name, value }[]` for `select` |
| `links` | `{ name, url }[]` rendered under the description |
| `required` | **Advisory only** — nothing here enforces it |
| `scope` | Free-form tag carried through untouched (e.g. client/server) |
| *(anything else)* | Preserved for your own renderers |

`type` is typed as `SettingsFieldType | (string & {})` on purpose: an unrecognised type
falls through to the `unknown` renderer rather than crashing.

## Commit semantics

- **Text inputs commit on blur**; **selects and switches commit immediately**.
- `onChange` is the optimistic per-keystroke hook; `onCommit` is the persist step.
- `onCommit` may be async — `useCommit` shows a spinner while the promise is pending,
  with a brief minimum so instant saves still register visually.
- `getValue` returning `undefined` falls back to the field's `default`. It is called
  per field, so client- and server-scoped reads can differ.

## Recipes

**A custom control.** Pass `renderers={{ theme: MyThemeField }}`. Your component
receives `SettingsFieldRenderProps`: `field`, `value`, `onChange`, `onCommit`,
`variant`, `anchorId`, `titleAddon`. Wrap it in the exported `FieldShell` to inherit the
label/description/links layout, and call `useCommit` for the pending state.
`builtinRenderers` is exported if you want to extend rather than replace.

**Layout.** `variant`: `"card"`, `"inline"`, `"ghost"`. Finer control via
`classNames: { root, header, title, description, control }`.

**Deep links.** `anchorId={(f) => "setting-" + f.key}` gives each container a stable DOM
id; `renderTitleAddon` puts a copy-link button beside the title.

**Compose directly.** `SettingsField` (the dispatcher), `StringField`, `PasswordField`,
`TextareaField`, `SelectField`, `SwitchField` and the re-exported shadcn `Switch` and
`select` primitives are all available if you are not using `SettingsList`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| A text field doesn't save | Text inputs commit on **blur**, not on change. Use `onChange` if you need every keystroke. |
| The spinner never clears | `onCommit` returned a promise that never settles, or threw outside the `await`. `useCommit` clears in a `finally`, but only if it gets there. |
| A field renders empty despite a `default` | `getValue` returned something other than `undefined` (e.g. `""` or `null`) — only `undefined` triggers the default. |
| An unknown `type` renders a fallback | Expected. Supply a renderer under that key. |
| `required` fields submit empty | It is advisory metadata; validate in `onCommit`. |
| A select shows raw values | `options` entries need both `name` (label) and `value`. |
| The form looks unstyled | It emits Tailwind/shadcn class names; the host needs those tokens and a Tailwind build that scans this package. |
| Fields reorder unexpectedly | Order is the `fields` array order, and `key` is the React key — a duplicated `key` will misbehave. |
| Consumers see stale components | `bun run build` (vite + `tsc -p tsconfig.build.json`); it is consumed as built `dist/`. |
