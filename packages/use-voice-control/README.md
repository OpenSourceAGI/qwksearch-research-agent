<p align="center">
    <img src="https://i.imgur.com/ypVzqbg.png" />
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/dm/use-voice-control.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/v/use-voice-control.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/dt/use-voice-control.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/types/use-voice-control" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=use-voice-control"><img src="https://packagephobia.com/badge?p=use-voice-control" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/use-voice-control"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<p align="center">
    <a href="https://www.npmjs.com/package/use-voice-control">NPM</a> •
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/use-voice-control">GitHub</a> •
    <a href="https://discord.gg/SJdBqBz3tV">Discord</a>
</p>

## use-voice-control

React hooks and components for seamless voice control and speech I/O (Speech-to-Text and Text-to-Speech). Build voice-enabled applications with client-side speech recognition and server-side or client-side speech synthesis.

```bash
npm install use-voice-control
```

Or read a document aloud straight from the terminal, no install and no code:

```bash
npx use-voice-control README.md -o readme.wav
```

---

## 🎤 Features

### Speech-to-Text (STT)
- **Moonshine.js**: Fast, accurate client-side speech recognition running entirely in the browser
- **WebRTC Audio Capture**: Real-time microphone input with automatic gain control
- **Multi-language Support**: Recognize speech in 100+ languages
- **Offline-First**: No external API calls required for STT

### Text-to-Speech (TTS)
- **Kokoro TTS**: Natural-sounding synthesis on Node.js/Edge with 16 pre-trained voices
- **Deepgram TTS**: Enterprise-grade speech synthesis with 12 Aura voices
- **Server & Client Support**: Run on backend or stream to client
- **Multiple Output Formats**: WAV, PCM, or raw audio buffers

### Markdown & Files

- **Markdown aware**: `#`, `**` and backticks are never read out — headings are
  spoken as headings, code blocks are announced, links keep their text
- **Files in, audio out**: `.md` and `.txt` files rendered to WAV from the
  [command line](#-command-line) or from Node
- **Local synthesis**: Kokoro runs on the CPU, so document text never leaves the machine

### React Integration
- **Custom Hooks**: `useVoiceControl()`, `useSpeechRecognition()`, `useSpeechSynthesis()`
- **Pre-built Components**: Audio recorder, voice selector, playback controls
- **State Management**: Streaming, loading, error handling baked in

---

## 🚀 Quick Start

### Installation

```bash
npm install use-voice-control
```

### Basic STT Example

```ts
import { useSpeechRecognition } from 'use-voice-control/hooks';

export function VoiceInput() {
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    language: 'en-US'
  });

  return (
    <div>
      <button onClick={startListening} disabled={isListening}>
        🎤 Start Recording
      </button>
      <button onClick={stopListening} disabled={!isListening}>
        ⏹️ Stop
      </button>
      <p>You said: {transcript}</p>
    </div>
  );
}
```

### Basic TTS Example

```ts
import { useSpeechSynthesis } from 'use-voice-control/hooks';

export function VoiceOutput() {
  const { speak, isSpeaking } = useSpeechSynthesis({
    provider: 'kokoro',
    voice: 'af_heart' // Female voice
  });

  return (
    <button onClick={() => speak("Hello, world!")}>
      {isSpeaking ? '🔊 Speaking...' : '▶️ Play'}
    </button>
  );
}
```

---

## 🖥️ Command Line

Read a Markdown or text file aloud into an audio file, without writing any code:

```bash
npx use-voice-control README.md
# wrote README.wav — 96.4s of audio from README.md in 41.2s
```

The Markdown is **converted before it is spoken**: `#`, `**`, backticks and the
rest are never read out. Headings become their own spoken lines with a pause
after them, list markers are dropped (ordered numbers are kept), links keep their
text and lose their URL, tables are read row by row, and fenced code blocks are
announced — "TypeScript code block." — instead of being spelled out character by
character. See [Markdown → speech](#-markdown--speech) for the rules and how to
change them.

Speech is synthesized locally with [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)
on the CPU: nothing is sent to a third-party service. The first run downloads the
weights (about 90 MB at the default `q8`) into the Hugging Face cache; every run
after that is offline.

### Common commands

```bash
# Markdown or plain text in, WAV out (defaults to <input>.wav, next to the input)
npx use-voice-control notes.md
npx use-voice-control notes.txt -o spoken.wav

# Pick a voice and a speaking rate
npx use-voice-control notes.md -v am_michael -s 1.15
npx use-voice-control --list-voices

# Speak a string, no file needed
npx use-voice-control --text "Build finished, three tests failed." -o alert.wav

# Read from a pipe, and write the WAV to stdout
cat notes.md | npx use-voice-control - -o - > notes.wav
git log -1 --format=%B | npx use-voice-control - -o commit.wav

# Check what will be spoken, without downloading the model
npx use-voice-control README.md --print
```

`--print` is the fastest way to see the Markdown conversion — it converts the
document, prints the text, and exits before any model is loaded.

### Options

| Option | Meaning |
| --- | --- |
| `<file>` | File to read. `-` reads stdin. `.md`, `.markdown`, `.mdx` are read as Markdown; everything else as plain text. |
| `--text <string>` | Speak this string instead of reading a file. |
| `-f, --format <fmt>` | `auto` (default), `markdown`, or `text`. Overrides the extension. |
| `-o, --out <file>` | Audio file to write. Default: the input path with a `.wav` extension, or `out.wav` when the input is stdin or `--text`. `-` writes the WAV to stdout. |
| `-p, --print` | Print the speakable text and exit — no model, no audio. |
| `-q, --quiet` | No progress output. |
| `-v, --voice <id>` | Voice id, default `af_heart`. See `--list-voices`. |
| `-s, --speed <n>` | Speaking rate between 0.5 and 2. Default 1. |
| `--headings <mode>` | `text` (default), `announce` ("Heading: Install"), or `skip`. |
| `--code <mode>` | `announce` (default), `read`, or `skip`. |
| `--links <mode>` | `text` (default) or `text-and-url`. |
| `--tables <mode>` | `rows` (default) or `skip`. |
| `--front-matter` | Read the YAML front matter instead of skipping it. |
| `--model <id>` | Hugging Face model id. Default `onnx-community/Kokoro-82M-v1.0-ONNX`. |
| `--dtype <type>` | `fp32`, `fp16`, `q8` (default), `q4`, `q4f16`. |
| `--device <device>` | `cpu` (default), `wasm`, `webgpu`. |
| `--chunk <chars>` | Target characters per synthesis chunk. Default 400. |
| `--gap <ms>` | Silence inserted between chunks. Default 120. |
| `-h, --help` | Show the full usage text. |
| `-V, --version` | Print the package version. |

Long documents are split on sentence and paragraph boundaries, synthesized chunk
by chunk, and joined into one file — Kokoro's context is only a few hundred
phonemes, so this is what makes a whole README work.

The command exits `0` on success and `1` on a bad option, a missing file, a
document with nothing to say, or a failed model load; progress goes to stderr, so
`-o -` gives you a clean WAV on stdout.

### From code

The same thing without the shell:

```ts
import { renderDocument } from 'use-voice-control/node';

const result = await renderDocument({
  file: 'README.md',
  output: 'readme.wav',
  voice: 'af_heart',
});

console.log(`${result.durationSeconds.toFixed(1)}s of audio from ${result.source}`);
```

`use-voice-control/node` also exports `loadDocument` (file → speakable text),
`synthesizeSamples` / `synthesizeWav` (text → audio), `runCli`, and the Markdown
helpers below.

---

## 📝 Markdown → speech

Markdown handed straight to a speech engine is read literally: *"hash hash
Getting started"*, *"star star important star star"*. `markdownToSpeech` parses
the document instead and emits only the words, keeping the structure the marks
encoded.

```ts
import { markdownToSpeech } from 'use-voice-control/markdown';

markdownToSpeech('## Install\n\nRun `npm i` and see the [docs](https://x.dev).');
// "Install.
//
//  Run npm i and see the docs."
```

| Markdown | Spoken as |
| --- | --- |
| `# Heading` and setext underlines | The heading text on its own, with a pause after it |
| `**bold**`, `_italic_`, `~~struck~~` | The words, no marks |
| `` `code span` `` | The code text, no backticks |
| A fenced code block | "TypeScript code block." (or the code, or nothing) |
| `[text](url)` | The link text; the URL is dropped |
| `![alt](src)` | The alt text |
| `- item`, `1. item`, `- [x] task` | The item; bullets and checkboxes dropped, numbers kept |
| `> quote` | The quoted words |
| `\| a \| b \|` | "a, b." — the delimiter row is dropped |
| `---`, `<!-- … -->`, `[ref]: url` | Nothing |
| YAML front matter | Nothing, unless `frontMatter: true` |

Options: `headings` (`text` \| `announce` \| `skip`), `codeBlocks` (`announce` \|
`read` \| `skip`), `links` (`text` \| `text-and-url`), `images` (`alt` \| `skip`),
`tables` (`rows` \| `skip`), `frontMatter`, and `addTerminalPunctuation`.

`markdownToSpeechSegments` returns the same content as typed blocks —
`{ type: 'heading' | 'paragraph' | 'list-item' | 'quote' | 'code' | 'table-row',
text, level }` — for callers that want to highlight the current heading or skip
between sections. `stripInlineMarkdown` handles a single line, and
`looksLikeMarkdown` is the heuristic behind `--format auto`.

The same conversion runs in the browser: `ReadAloudController` and `useReadAloud`
convert text that looks like Markdown before speaking it, so an editor's raw
document does not have its syntax read back to the listener.

---

## 🗣️ Read Aloud & Live Dictation

Two ready-made browser engines ship from `use-voice-control/client` (framework
agnostic) and `use-voice-control/react` (hooks plus an on-screen phrase display).
They back the **Read aloud** and **Dictate** tools in the REASON editor and the
chat composer.

### Read aloud

`ReadAloudController` chunks text along sentence and paragraph boundaries,
synthesizes each chunk (Kokoro via `POST /api/speech/tts` by default) and plays
them back-to-back while pre-fetching the next — so playback starts after the first
short chunk instead of after the whole document. If no TTS route answers, it falls
back to the browser's built-in `speechSynthesis` rather than failing.

```tsx
import { useReadAloud } from 'use-voice-control/react';

function ReadButton({ text }: { text: string }) {
  const { toggle, isActive, currentChunk } = useReadAloud({ voice: 'af_heart' });

  return (
    <button onClick={() => toggle(text)}>
      {isActive ? `Stop (${currentChunk?.index ?? 0})` : 'Read aloud'}
    </button>
  );
}
```

Options: `provider`, `voice`, `endpoint`, `maxChunkLength`, `format`
(`auto` \| `markdown` \| `text` — `auto` converts text that looks like Markdown so
`##` and `**` are not read out), `markdown` for the conversion options, and
`synthesize` to plug in your own TTS. Controls: `speak`, `pause`, `resume`,
`stop`, `toggle`.

### Live dictation

`LiveTranscriber` reports two streams: `onPartial`, the guess that keeps changing
while a phrase is being spoken, and `onCommit`, the phrase the recognizer settled
on. The first is what lets you type words into an input *as they are said*. It
prefers the browser's own `SpeechRecognition` (no model download) and falls back to
on-device Moonshine; Chromium's recognizer stops itself after a pause, so sessions
restart automatically.

```tsx
import { useLiveTranscription, SpokenPhraseOverlay } from 'use-voice-control/react';

function Dictate() {
  const [text, setText] = useState('');
  const base = useRef('');

  const { toggle, isListening, lastPhrase, phraseId } = useLiveTranscription({
    onPartial: (phrase) => setText(`${base.current}${phrase}`),
    onCommit: (phrase) => {
      base.current = `${base.current}${phrase} `;
      setText(base.current);
    },
  });

  return (
    <>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={toggle}>{isListening ? 'Stop' : 'Dictate'}</button>
      <SpokenPhraseOverlay phrase={lastPhrase} phraseId={phraseId} visible={isListening} />
    </>
  );
}
```

`<SpokenPhraseOverlay />` shows the latest phrase in large type at the centre of the
viewport and fades out two seconds after the last update, so you can confirm you
were heard without watching the input. It renders through a portal with pointer
events disabled and is styled inline, so it looks the same in any app.

---

## 📚 API Reference

### Hooks

#### `useSpeechRecognition(options)`

Captures audio from the user's microphone and converts it to text using Moonshine.js.

**Options:**
```ts
interface SpeechRecognitionOptions {
  language?: string;           // Default: 'en-US'
  autoStart?: boolean;          // Default: false
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  autoStopTimeout?: number;     // Auto-stop after silence (ms)
}
```

**Returns:**
```ts
{
  transcript: string;           // Current transcribed text
  isListening: boolean;         // Recording in progress
  isFinal: boolean;            // Transcript is final
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: Error | null;
}
```

---

#### `useSpeechSynthesis(options)`

Converts text to speech and plays it back with optional streaming.

**Options:**
```ts
interface SpeechSynthesisOptions {
  provider?: 'kokoro' | 'deepgram';  // Default: 'kokoro'
  voice?: string;                     // Provider-specific voice ID
  rate?: number;                      // Speech rate (0.5 - 2.0)
  pitch?: number;                     // Voice pitch (0.5 - 2.0)
  volume?: number;                    // Volume (0 - 1)
  onError?: (error: Error) => void;
}
```

**Returns:**
```ts
{
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  error: Error | null;
}
```

---

#### `useVoiceControl(options)`

Combined STT + TTS hook for full voice control workflows.

**Options:**
```ts
interface VoiceControlOptions {
  sttOptions?: SpeechRecognitionOptions;
  ttsOptions?: SpeechSynthesisOptions;
  onTranscriptEnd?: (transcript: string) => Promise<string>;
  autoPlayResponse?: boolean;  // Auto-play TTS response
}
```

**Returns:**
```ts
{
  // STT state
  transcript: string;
  isListening: boolean;
  // TTS state
  isSpeaking: boolean;
  // Combined control
  toggleListening: () => void;
  speak: (text: string) => void;
  reset: () => void;
}
```

---

### Voice Options

#### Kokoro Voices

28 voices optimized for natural speech synthesis. Run `npx use-voice-control
--list-voices` to print them with their accent and gender. The `a`/`b` prefix is
the accent (American / British English) and the letter after it is the gender.

**American English — female:**
```
af_heart    - Warm, caring tone      af_nicole   - Clear, articulate
af_alloy    - Neutral, professional  af_nova     - Even, unhurried
af_aoede    - Bright, energetic      af_river    - Calm, soothing
af_bella    - Soft, gentle           af_sarah    - Warm, approachable
af_jessica  - Friendly, conversational
af_kore     - Steady, measured       af_sky      - Young, vibrant
```

**American English — male:**
```
am_adam     - Deep, authoritative    am_michael  - Professional, clear
am_echo     - Resonant, smooth       am_onyx     - Dark, mysterious
am_eric     - Direct, matter-of-fact am_puck     - Playful, quick
am_fenrir   - Bold, strong           am_santa    - Jovial, avuncular
am_liam     - Friendly, warm
```

**British English:**
```
bf_alice    - Crisp, precise         bm_daniel   - Measured, formal
bf_emma     - Warm, unhurried        bm_fable    - Narrative, engaging
bf_isabella - Bright, articulate     bm_george   - Deep, steady
bf_lily     - Light, gentle          bm_lewis    - Relaxed, conversational
```

**Example:**
```ts
const { speak } = useSpeechSynthesis({
  provider: 'kokoro',
  voice: 'af_heart'
});
```

---

#### Deepgram Aura Voices

12 natural-sounding voices for enterprise applications:

```
angus, asteria, arcas, orion, orpheus, athena,
luna, zeus, perseus, helios, hera, stella
```

**Example:**
```ts
const { speak } = useSpeechSynthesis({
  provider: 'deepgram',
  voice: 'luna'
});
```

---

### Components

#### `<AudioRecorder />`

Pre-built recording interface with visual feedback.

```tsx
import { AudioRecorder } from 'use-voice-control/components';

<AudioRecorder 
  onTranscript={(text) => console.log(text)}
  language="en-US"
/>
```

#### `<VoiceSelector />`

Dropdown to choose between available voices.

```tsx
import { VoiceSelector } from 'use-voice-control/components';

<VoiceSelector 
  provider="kokoro"
  onChange={(voice) => setSelectedVoice(voice)}
/>
```

#### `<AudioPlayer />`

Controls for playback of generated speech.

```tsx
import { AudioPlayer } from 'use-voice-control/components';

<AudioPlayer 
  src={audioUrl}
  autoPlay={false}
/>
```

---

## 🔌 Core API

### Server-Side Speech Synthesis

Generate speech audio directly from the server or Edge runtime:

```ts
import { generateSpeech } from 'use-voice-control/speech';

// Generate Kokoro speech — runs the model locally on the CPU via `kokoro-js`
const audio = await generateSpeech({
  text: "Hello, world!",
  provider: 'kokoro',
  voice: 'af_heart'
});

// Returns: { audio: ArrayBuffer, contentType: string } — a 16-bit PCM WAV
```

Text longer than the model's context is chunked on sentence boundaries and joined
automatically, so a whole document can be passed in one call. Deepgram
(`provider: 'deepgram'`) goes through a Cloudflare Workers AI binding instead and
returns MP3; it is not available from the CLI.

### TypeScript Support

Full type definitions included:

```ts
import type { TTSProvider, KokoroVoice, DeepgramSpeaker } from 'use-voice-control/speech';

const provider: TTSProvider = 'kokoro';
const voice: KokoroVoice = 'af_heart';
```

---

## 🏗️ Architecture

### Speech-to-Text Pipeline
1. **Audio Capture** → WebRTC microphone input with automatic gain control
2. **Buffering** → Circular audio buffer with silence detection
3. **Inference** → Moonshine.js runs model in Web Worker to avoid blocking
4. **Streaming** → Real-time transcript updates as user speaks
5. **Final Output** → Complete transcript on stop or timeout

### Text-to-Speech Pipeline
1. **Input Processing** → Text validation and segmentation
2. **Synthesis** → Kokoro or Deepgram provider synthesis
3. **Format Conversion** → Audio buffer to playable format
4. **Streaming** → Optional chunked playback
5. **Playback Control** → Native audio element with pause/resume/volume

---

## 🎯 Use Cases

### Customer Support Chatbots
```tsx
<VoiceControl 
  onTranscriptEnd={async (text) => {
    const response = await fetchChatbotResponse(text);
    return response;
  }}
  autoPlayResponse={true}
/>
```

### Voice-Controlled Search
```tsx
const { transcript, speak } = useVoiceControl();

const handleSearch = async () => {
  const results = await searchAPI(transcript);
  speak(`Found ${results.length} results`);
};
```

### Accessibility Features
```tsx
<AudioRecorder onTranscript={setText} />
<VoiceButton onClick={() => speak(text)} />
```

### Multilingual Apps
```ts
useSpeechRecognition({ language: 'es-ES' });
useSpeechSynthesis({ voice: 'af_bella' });
```

---

## ⚙️ Configuration

### Next.js Integration

Add to `next.config.js`:

```js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};
```

### Web Worker Setup

STT uses Web Workers automatically. Ensure your build tool supports workers:

```ts
// Vite
import SpeechWorker from 'use-voice-control/speech/worker?worker';

// Webpack/Next.js
const SpeechWorker = require('use-voice-control/speech/worker.js');
```

---

## 🔐 Privacy & Security

- **Client-side STT**: Moonshine.js runs entirely in the browser—no audio leaves your device
- **Local CLI TTS**: `npx use-voice-control` runs Kokoro on your CPU; the document text is never uploaded
- **Optional Server TTS**: Choose Kokoro (server-side) or Deepgram (with API key)
- **No Tracking**: No analytics or usage telemetry
- **HTTPS Required**: Microphone access requires secure context

---

## 🐛 Troubleshooting

### Microphone Access Denied
- Ensure HTTPS or localhost
- Check browser permissions (Settings → Privacy → Microphone)
- Grant permission when prompted

### Silent or Garbled Audio
- Adjust `volume` in `useSpeechSynthesis` options
- Try a different voice or provider
- Check speaker/headphone connection

### STT Not Recognizing Speech
- Verify microphone is working (test in browser console)
- Speak clearly and at normal volume
- Check language setting matches spoken language

---

## 📦 Exports

```ts
// Read aloud & live dictation (implemented)
export { ReadAloudController, LiveTranscriber, isTranscriptionSupported } from 'use-voice-control/client';
export { useReadAloud, useLiveTranscription, SpokenPhraseOverlay } from 'use-voice-control/react';

// Markdown → speech (implemented)
export { markdownToSpeech, markdownToSpeechSegments, stripInlineMarkdown, looksLikeMarkdown } from 'use-voice-control/markdown';
export type { MarkdownToSpeechOptions, SpeechSegment } from 'use-voice-control/markdown';

// Files → audio, and the CLI (implemented, Node)
export { renderDocument, loadDocument, synthesizeSamples, synthesizeWav, runCli } from 'use-voice-control/node';
export type { RenderOptions, RenderResult, KokoroNodeOptions } from 'use-voice-control/node';

// Hooks
export { useSpeechRecognition } from 'use-voice-control/hooks';
export { useSpeechSynthesis } from 'use-voice-control/hooks';
export { useVoiceControl } from 'use-voice-control/hooks';

// Components
export { AudioRecorder } from 'use-voice-control/components';
export { VoiceSelector } from 'use-voice-control/components';
export { AudioPlayer } from 'use-voice-control/components';

// Core API
export { generateSpeech } from 'use-voice-control/speech';
export type { TTSProvider, TTSOptions, KokoroVoice, DeepgramSpeaker } from 'use-voice-control/speech';
```

---

## 📄 License

[rights.institute/PROSPER](https://rights.institute/PROSPER)

## 🤝 Contributing

We welcome contributions! Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) and open a PR.

- **Issues**: [GitHub Issues](https://github.com/OpenSourceAGI/qwksearch-research-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions)
- **Discord**: [Join Community](https://discord.gg/SJdBqBz3tV)

---

## 🔗 Related Packages

- [qwksearch-api-client](../qwksearch-api-client) - API client for search and content extraction
- [agent-toolkit](../agent-toolkit) - Multi-provider LLM agent toolkit
- [research-agent-ui](../research-agent-ui) - React UI components for research agents

---

## 📖 Documentation

- [Voice Recognition with Moonshine.js](https://github.com/openvino/openvino.js/tree/master/src/pages/docs/learn/code_examples/speech_recognition)
- [Kokoro TTS Documentation](https://huggingface.co/hexgrad/Kokoro-82M)
- [Deepgram API Reference](https://developers.deepgram.com/reference/text-to-speech)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /> Please star this repo for updates! ⭐
