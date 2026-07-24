<p align="center">
    <img  src="https://i.imgur.com/ypVzqbg.png"  />
<br /> 
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/dm/use-voice-control.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/use-voice-control"><img src="https://img.shields.io/npm/v/use-voice-control.svg" alt="npm version"></a>
    <a href="https://bundlephobia.com/package/use-voice-control" target="_blank" rel="noopener noreferrer">
  <img
    src="https://img.shields.io/bundlephobia/minzip/use-voice-control?style=flat&label=size"
    alt="npm bundle size "
  />
</a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/OpenSourceAGI/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/OpenSourceAGI/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

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

16 professional voices optimized for natural speech synthesis:

**Female Voices:**
```
af_heart    - Warm, caring tone
af_alloy    - Neutral, professional
af_aoede    - Bright, energetic
af_bella    - Soft, gentle
af_jessica  - Friendly, conversational
af_nicole   - Clear, articulate
af_river    - Calm, soothing
af_sarah    - Warm, approachable
af_sky      - Young, vibrant
```

**Male Voices:**
```
am_adam     - Deep, authoritative
am_echo     - Resonant, smooth
am_fable    - Narrative, engaging
am_fenrir   - Bold, strong
am_liam     - Friendly, warm
am_michael  - Professional, clear
am_onyx     - Dark, mysterious
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

// Generate Kokoro speech
const audio = await generateSpeech({
  text: "Hello, world!",
  provider: 'kokoro',
  voice: 'af_heart'
});

// Returns: { audio: ArrayBuffer, contentType: string }
```

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
