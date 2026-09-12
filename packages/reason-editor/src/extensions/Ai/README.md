# Ai — writing assistant

Streams a model's suggestion for the current selection (or the caret), shows it
as an inline red/green diff, and writes nothing to the document until the user
accepts it.

## Entry points

| Trigger | Where |
| --- | --- |
| `AI` button | main toolbar (`RichTextAi`) |
| ✨ Ask AI | selection bubble menu |
| `⌘/Ctrl + J` | keyboard, anywhere in the editor |
| `/ai` | slash-command menu |

All four open the same floating panel (`AiMenu`): a filterable command palette
plus a free-form prompt box. Typing filters the commands; `↑`/`↓` and `Enter`
run one, `Enter` on an empty highlight submits the typed prompt instead.

## Review flow

Nothing is applied automatically. While the answer streams the panel shows it
with a **Stop** control (stopping keeps what has already arrived), and once it
settles the actions are **Replace selection** (`⌘/Ctrl + Enter`), **Insert
below**, **Try again**, **Copy** and **Discard**.

## Wiring a real model

The extension ships with an offline demo transform so the menu works with no
backend. Point it at a real one with `getCompletion`:

```ts
import { Ai, createStreamingCompletion } from 'react-reason-editor/ai';

Ai.configure({
  getCompletion: createStreamingCompletion({ endpoint: '/api/ai' }),
  // How much text around the selection is sent as context. 0 sends none.
  contextChars: 4000,
});
```

`createStreamingCompletion` handles a plain text stream, an OpenAI-compatible
SSE stream, and a single JSON object (`{ rewrittenText }`, `{ text }`,
`{ choices: [...] }`), and surfaces a JSON `error` body as the message shown in
the panel. For anything else, implement `AiCompletionFn` directly — it is
called with the instruction, the selection, a clamped context window, the
command id and a `systemPrompt`, plus an `AbortSignal` that fires when the user
cancels.

In this repo the plugin registry defaults the endpoint to the QwkSearch web
app's `/api/agent/rewrite`; it is editable (and clearable, to fall back to the
demo transform) under Settings → Plugins → AI Writing.

`createRewriteCompletion` sends `stream: true` with that request. It is a hint,
not a requirement: `/api/agent/rewrite` answers with a `text/plain` token stream
when it sees the flag (and the host wired `streamText`), and with its original
`{ rewrittenText }` JSON when it does not. Either way the panel works — without
streaming the answer simply lands in one piece instead of filling in as the
model writes, so a route of your own can ignore the flag entirely.

## What the extension guarantees about the output

- The response is sanitised before it is shown or applied: chat preambles
  ("Sure — here's a tighter version:"), code fences wrapping the whole answer,
  and quotes around the whole answer are removed, and blank-line runs are
  collapsed. The same clean-up runs on every streamed chunk, so the preview and
  the accepted text always match.
- Markdown structure in the answer (lists, headings, emphasis, tables) is
  converted to real nodes on accept, so "Key takeaways" produces a bullet list
  rather than literal `- ` characters. A single-line rewrite is inserted as
  plain text so the marks already on the range survive.
- Commands that rewrite a selection are hidden — and refuse to run — when the
  caret is collapsed, so they never answer confidently about nothing.

## The Plate editor

`src/docs-agent/plate` mounts the same assistant. Its `AiKit`
(`src/docs-agent/plate/kits/ai-kit.tsx`) registers a Plate plugin keyed
`KEYS.aiChat` whose panel opens from the bubble menu's ✨ **Ask AI** button, the
slash menu's **AI** item, or `⌘/Ctrl + J`, and it runs the command set, prompts
and response sanitising from this directory — only the document half is
re-implemented for Slate, in `src/docs-agent/plate/ai-controller.ts`.

Every one of those entry points goes through `getPlateAiController(editor)`.
That matters more than it looks: the components under `src/docs-agent/plate/ui`
are copies of Plate's shadcn registry, and upstream's versions reach for
`editor.getApi(AIChatPlugin).aiChat.show()` instead. On this editor that API was
never registered, so the call throws and the entry point silently does nothing —
and `getApi` is typed off the plugin handed to it rather than off what the
editor actually has, so nothing catches it before a browser does.

It is deliberately not Plate's own `@platejs/ai` `AIChatPlugin`: that needs the
Vercel AI SDK in the bundle and a streaming chat route to talk to, neither of
which a published editor library can bring with it, whereas `getCompletion`
above is already the answer to that question. Configure it the same way:

```ts
import { createAiKit } from 'react-reason-editor/docs-agent';

createPlateEditor({
  plugins: [
    ...otherPlugins,
    ...createAiKit({
      getCompletion: createStreamingCompletion({ endpoint: '/api/ai' }),
      contextChars: 8000,
    }),
  ],
});
```

One behavioural difference: on Plate the review surface is the panel's preview
rather than an inline red/green diff, because Slate has no decoration layer to
draw one with. What that preserves is the rule that matters — nothing reaches
the document until the user accepts.

## Customising the commands

```ts
Ai.configure({
  commands: [
    ...DEFAULT_AI_COMMANDS,
    {
      id: 'cut-card',
      label: 'Cut this evidence',
      description: 'Condense into a debate card',
      icon: Scissors,
      group: 'transform',
      prompt:
        'Condense this evidence into a debate card. Preserve exact quotations and identify the claim and the warrant. Do not invent citations.',
    },
  ],
});
```

`group` places the command under a menu heading (`edit`, `tone`, `transform`,
`generate`), `requiresSelection: false` makes it available at a bare caret, and
`options` turns it into a submenu (that is how Translate picks its language).
