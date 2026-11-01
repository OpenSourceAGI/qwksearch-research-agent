---
name: ask-use-voice-control
description: Guide to use-voice-control (packages/use-voice-control), the speech-I/O toolkit — the five subpath entries (root TTS, /client engines, /react hooks, /node document rendering, /markdown), generateSpeech with the Kokoro and Deepgram providers, ReadAloudController and LiveTranscriber, useReadAloud / useLiveTranscription / SpokenPhraseOverlay, the markdown-to-speech converter, the 28 Kokoro voices, and the read-aloud CLI. Use when adding text-to-speech or dictation to a UI, when audio fails to generate or the Cloudflare AI binding is missing, when Markdown is read out with its syntax, or when the CLI reports the package is not built.
---

# Working With use-voice-control

`packages/use-voice-control`, published as **use-voice-control**. Speech-to-text
(Moonshine.js, in-browser), text-to-speech (Kokoro locally, or Deepgram Aura via
Cloudflare Workers AI) and a CLI that reads a document aloud into a file. Note the
source lives under `speech/`, not `src/`.

## Pick the right entry

| Subpath | For | Contains |
| --- | --- | --- |
| `use-voice-control` | Server or Worker TTS | `generateSpeech`, WAV helpers, the markdown converter |
| `use-voice-control/client` | Framework-agnostic browser | `ReadAloudController`, `LiveTranscriber`, `isTranscriptionSupported` |
| `use-voice-control/react` | React | `useReadAloud`, `useLiveTranscription`, `SpokenPhraseOverlay` (+ the client exports) |
| `use-voice-control/node` | Node | `renderDocument`, `loadDocument`, Kokoro-on-Node, `runCli` |
| `use-voice-control/markdown` | Anywhere | `markdownToSpeech` and friends alone |
| `use-voice-control/api-client` | — | Resolves to raw `speech/api-client.ts` source |

React callers should use `/react`, which wraps the `/client` engines.

## Setup

```ts
// Server / Worker
import { generateSpeech } from "use-voice-control";
const { audio, contentType } = await generateSpeech({ text, voice: "af_heart" });      // Kokoro
const dg = await generateSpeech({ text, provider: "deepgram", voice: "angus" });        // needs the CF AI binding

// React
import { useReadAloud, useLiveTranscription } from "use-voice-control/react";

// CLI — no install needed
npx use-voice-control README.md -o readme.wav
```

Peers: `react`, `react-dom`. `@huggingface/transformers`, `kokoro-js` and
`@moonshine-ai/moonshine-js` are real dependencies — the models are large, so keep the
TTS/STT surface out of a bundle that does not need it.

## Recipes

**Providers.** `generateSpeech({ text, provider = "kokoro", voice = "af_heart" })` →
`{ audio: ArrayBuffer, contentType }`. Kokoro runs on Node CPU and needs nothing;
Deepgram resolves the Cloudflare `AI` binding at runtime (via the async-local-storage
context or `globalThis.__env__.AI`) and throws when it is absent.

**Voices.** 28 Kokoro ids in `KOKORO_VOICES`; the prefix encodes accent and gender
(`a`/`b` = American/British, `f`/`m` = female/male), and `describeKokoroVoice` derives a
listing from the id so no second table can drift. `--list-voices` prints them.

**Markdown is converted, not spoken raw.** `markdownToSpeech` / `markdownToSpeechSegments`
drop `#` and `**`, make headings their own spoken lines, keep link text, and announce
fenced code blocks instead of spelling them out. `--headings text|announce|skip` and
`--code announce|read|skip` tune it; `looksLikeMarkdown` auto-detects. The same rules
back the CLI, the browser and any server route — call it before `generateSpeech` rather
than re-inventing the stripping.

**Dictation.** `LiveTranscriber` (`useLiveTranscription`) runs Moonshine.js entirely
in-browser — no API call. Gate the UI on `isTranscriptionSupported()`.

**Read-aloud.** `ReadAloudController` (`useReadAloud`) chunks text and plays it,
supporting interruption; pass a `SynthesizeFn` to point it at your own TTS route.
`SpokenPhraseOverlay` echoes the phrase just spoken.

**CLI.** `-o` output (`-` for stdout), `--text` to speak a literal string, `-` as the
input to read stdin, `-p/--print` to dump the speakable text without loading a model,
`-v/--voice`, `-s/--speed` (0.5–2), `-q/--quiet`, `-f/--format auto|markdown|text`.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `use-voice-control: the package is not built — run npm run build …` | `bin/use-voice-control.mjs` is a thin launcher for `dist/cli.js`. Run `bun run build` in the package. |
| `Cloudflare AI binding not available` | Deepgram needs Workers AI. Bind `AI`, or use the default Kokoro provider. |
| `Text is required` | `generateSpeech` rejects empty/whitespace text before touching a model. |
| Markdown syntax is read out loud | You passed raw Markdown to `generateSpeech`. Run it through `markdownToSpeech` first. |
| Dictation does nothing in some browsers | Moonshine needs WebAssembly, microphone permission and a secure context. Check `isTranscriptionSupported()`. |
| Node code ends up in a browser bundle | Import `/client` or `/react`, never the root entry, from browser code. |
| `api-client` breaks the bundler | That subpath maps to raw `speech/api-client.ts`, unlike the others which map to `dist/`. |
| First synthesis is very slow | The Kokoro model loads once and is cached (`loadKokoroTTS` / `resetKokoroCache`). Warm it at startup. |
| Audio plays at the wrong pitch or length | The WAV is assembled by `encodeWav`/`concatSamples`; check sample rate before assuming the model is wrong. `wavDurationSeconds` reports the real length. |
