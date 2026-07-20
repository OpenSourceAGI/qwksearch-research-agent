# Kokoro.js Voice Integration

This document describes the Kokoro.js text-to-speech (TTS) integration in the research-agent-ui package.

## Overview

Kokoro.js is a local, client-side TTS engine that runs entirely in the browser using WebGPU or WASM. It provides:

- **Local processing**: No data sent to external servers
- **Low latency**: Direct browser execution
- **Multiple voices**: 10+ voice options including multiple accents
- **Fallback support**: Automatically falls back to Cloudflare Workers AI TTS if needed

## Installation

Kokoro.js is already included as a dependency in the package.json:

```json
{
  "dependencies": {
    "kokoro-js": "^1.2.1"
  }
}
```

## Usage

### Basic Hook Usage

```tsx
import { useKokoroTTS } from 'research-agent-ui';

export function MyComponent() {
  const { status, modelReady, voices, selectedVoice, speak, stop, warmupModel } = useKokoroTTS(
    'Hello, this is a test message'
  );

  return (
    <div>
      <button onClick={warmupModel} disabled={modelReady}>
        Load Model
      </button>
      <button onClick={speak} disabled={!modelReady}>
        Speak
      </button>
      <button onClick={stop}>Stop</button>
      <select value={selectedVoice} onChange={(e) => changeVoice(e.target.value)}>
        {voices.map((voice) => (
          <option key={voice} value={voice}>
            {voice}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Voice Settings Panel

A pre-built UI component is available:

```tsx
import { VoiceSettingsPanel } from 'research-agent-ui';

export function Settings() {
  return <VoiceSettingsPanel />;
}
```

This component provides:
- Toggle between Kokoro.js and Cloudflare TTS
- Voice selection for Kokoro.js
- Speaker selection for Cloudflare fallback
- Voice preview button
- Model preload controls

## Available Voices

Kokoro.js includes the following voices:

### American English
- `af_heart` - Female (Heart) - **Recommended**
- `af_bella` - Female (Bella)
- `af_nicole` - Female (Nicole)
- `af_sarah` - Female (Sarah)
- `am_adam` - Male (Adam)
- `am_michael` - Male (Michael)
- `am_tony` - Male (Tony)

### British English
- `bf_emma` - Female (Emma)
- `bm_george` - Male (George)
- `bm_thomas` - Male (Thomas)

## Configuration

### Local Storage Keys

The integration uses the following localStorage keys to persist user preferences:

- `useTTSKokoro` - Boolean to enable/disable Kokoro.js (default: `true`)
- `kokoroVoice` - Selected voice name (default: `af_heart`)
- `ttsSpeaker` - Selected Cloudflare speaker for fallback (default: `angus`)

### Backend Selection

Kokoro.js automatically selects the best backend:

- **WebGPU + fp32**: Used if browser supports WebGPU (best quality, fastest)
- **WASM + q8**: Fallback for universal browser support (good quality, slightly slower)

## Integration with useTextToSpeech

The existing `useTextToSpeech` hook has been updated to support Kokoro.js. It now:

1. Attempts to use Kokoro.js first (if `useTTSKokoro` is enabled)
2. Falls back to Cloudflare Workers AI TTS if Kokoro fails
3. Falls back to browser `speechSynthesis` API if both fail

### API

```tsx
import { useTextToSpeech } from 'research-agent-ui';

export function ChatMessage() {
  const { speechStatus, start, stop } = useTextToSpeech(
    'Your message text here',
    { enableInterrupt: true }
  );

  return (
    <div>
      <button onClick={start} disabled={speechStatus === 'started'}>
        {speechStatus === 'started' ? 'Playing...' : 'Read Aloud'}
      </button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

## Performance Considerations

### First Load

The first time a user enables Kokoro.js, the model must be downloaded:
- **WebGPU fp32**: ~326 MB (takes 10-30 seconds depending on connection)
- **WASM q8**: ~92 MB (faster download)

Subsequent uses have no download overhead due to browser caching.

### Generation Speed

After model load, TTS generation is very fast:
- ~100-200ms for typical message length
- Scales linearly with text length
- No network latency

### Browser Compatibility

- **WebGPU**: Chrome/Edge 113+, Firefox 120+ (requires flag), Safari 18+
- **WASM**: All modern browsers (fallback)

## Architecture

### Files

- `src/lib/kokoro.ts` - Core Kokoro initialization and management
- `src/hooks/voice/useKokoroTTS.ts` - React hook for Kokoro TTS
- `src/hooks/voice/useTextToVoice.ts` - Updated to support Kokoro fallback
- `src/components/VoiceSettings/KokoroVoiceSelector.tsx` - Voice selection UI
- `src/components/VoiceSettings/VoiceSettingsPanel.tsx` - Full settings panel

### Hook: useKokoroTTS

Manages Kokoro.js state and operations:

```tsx
const {
  status,           // 'idle' | 'loading' | 'generating' | 'playing' | 'error'
  modelReady,       // Boolean - whether model is loaded
  voices,           // Array of available voice names
  selectedVoice,    // Currently selected voice
  error,            // Error message if any
  warmupModel,      // Async function to load model
  speak,            // Async function to generate and play speech
  stop,             // Function to stop playback
  changeVoice,      // Function to change voice and persist to localStorage
  backend,          // 'wasm' or 'webgpu'
} = useKokoroTTS(text, { autoPreload: false });
```

## Integration Points

### In ChatMessageBubble

The voice button in assistant message actions now uses the updated `useTextToSpeech` hook which supports Kokoro.js:

```tsx
const { speechStatus, start, stop } = useTextToSpeech(speechMessage, {
  enableInterrupt: true,
});
```

When a user clicks "Read Aloud", the hook attempts Kokoro.js first, then falls back to other TTS options.

### Settings Integration

Add `VoiceSettingsPanel` to your settings page:

```tsx
import { VoiceSettingsPanel } from 'research-agent-ui';

export function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <VoiceSettingsPanel />
    </div>
  );
}
```

## Troubleshooting

### Model Fails to Load

1. Check browser console for errors
2. Verify internet connection (needed for first download)
3. Check available disk space (model is 92-326 MB depending on backend)
4. Try WASM backend instead of WebGPU

### TTS Generation Fails

1. Ensure model is loaded (check `modelReady` state)
2. Check browser console for specific error messages
3. Try fallback TTS options
4. Clear browser cache and retry

### Voice Not Changing

Check localStorage:
- Open DevTools → Application → Local Storage
- Verify `kokoroVoice` key contains the desired voice name

### Performance Issues

- **Slow generation**: Check text length (very long texts take longer)
- **Memory issues**: This is a limitation of the device; consider using fallback TTS
- **Model download too slow**: Upgrade internet connection or use WASM backend

## Future Enhancements

Potential improvements:

1. **Streaming TTS**: Use `TextSplitterStream` to start playback before full generation
2. **Voice cloning**: Support custom voice training
3. **Prosody control**: Adjust speed, pitch, and emphasis
4. **Real-time interruption**: Using VAD to interrupt mid-speech
5. **Caching layer**: Cache common responses for instant playback

## References

- [Kokoro.js GitHub](https://github.com/Kokoro-js)
- [Kokoro.js NPM](https://www.npmjs.com/package/kokoro-js)
- [Hugging Face Model Card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
