# Speech API Integration - Summary

This document summarizes the complete speech integration for TTS (Text-to-Speech) and STT (Speech-to-Text) in the qwksearch-web app.

## What Was Created

### 1. API Endpoints (`/app/api/speech/*`)

#### `/api/speech/tts` (POST)
Generates audio from text using Kokoro or Deepgram TTS.

**Request:**
```json
{
  "text": "Hello, world!",
  "provider": "kokoro",
  "voice": "af_heart"
}
```

**Response:** Audio binary (WAV or MP3) with cache headers

#### `/api/speech/stt` (GET/POST)
- GET: Returns API documentation
- POST: Placeholder for server-side transcription (not yet implemented; client-side Moonshine is primary)

### 2. Client Utilities (`lib/speech-api.ts`)

High-level functions for frontend use:

```ts
// Generate audio blob
const blob = await generateSpeechFromText(text, provider, voice);

// Create audio URL
const url = await createAudioURL(text, provider, voice);

// Speak text and wait for completion
await speakText(text, provider, voice);

// Check API availability
const available = await checkSTTAPI();
```

### 3. React Components

#### `SpeechInput.tsx`
Ready-to-use mic input component with:
- Moonshine.js STT (browser-side, no server needed)
- Optional TTS feedback (speaks transcribed text)
- Visual states: listening, loading, speaking
- Accessible design with icons (Mic → Stop square)

**Props:**
```ts
<SpeechInput
  onTranscription={(text) => { /* ... */ }}
  disabled={false}
  enableTTS={true}
  ttsProvider="kokoro"
  ttsVoice="af_heart"
/>
```

#### `SpeechSettings.tsx`
Configuration panel for:
- Enable/disable STT and TTS
- Choose TTS provider (Kokoro or Deepgram)
- Select voice from available options
- Test voice playback

**Props:**
```ts
<SpeechSettings onChange={(settings) => { /* ... */ }} />
```

### 4. React Hook (`hooks/useSpeech.ts`)

For advanced use cases:

```ts
const {
  isListening,
  isLoading,
  isSpeaking,
  partialText,
  error,
  startListening,
  stopListening,
  speak,
  generateAudio,
} = useSpeech({
  autoPlayFeedback: true,
  ttsProvider: 'kokoro',
  ttsVoice: 'af_heart',
});
```

### 5. Documentation

- `lib/speech/INTEGRATION.md` — Complete integration guide with examples
- `SPEECH_INTEGRATION_SUMMARY.md` — This file

## Quick Start

### Basic Usage

```tsx
'use client';

import { SpeechInput } from '@/components/SpeechInput';

export default function Page() {
  return (
    <SpeechInput 
      onTranscription={(text) => console.log('You said:', text)}
    />
  );
}
```

### With Settings

```tsx
'use client';

import { useState } from 'react';
import { SpeechInput } from '@/components/SpeechInput';
import { SpeechSettings } from '@/components/SpeechSettings';

export default function Page() {
  const [settings, setSettings] = useState({
    ttsEnabled: true,
    ttsProvider: 'kokoro',
    ttsVoice: 'af_heart',
    sttEnabled: true,
  });

  return (
    <div className="space-y-4">
      <SpeechSettings onChange={setSettings} />
      <SpeechInput
        onTranscription={(text) => console.log(text)}
        enableTTS={settings.ttsEnabled}
        ttsProvider={settings.ttsProvider}
        ttsVoice={settings.ttsVoice}
        disabled={!settings.sttEnabled}
      />
    </div>
  );
}
```

### Using the Hook

```tsx
'use client';

import { useSpeech } from '@/hooks/useSpeech';
import { Mic, Square } from 'lucide-react';

export default function Page() {
  const {
    isListening,
    isLoading,
    partialText,
    startListening,
    stopListening,
  } = useSpeech({ autoPlayFeedback: true });

  return (
    <div>
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isLoading}
      >
        {isListening ? <Square /> : <Mic />}
      </button>
      {partialText && <p>Hearing: {partialText}</p>}
    </div>
  );
}
```

## Architecture

```
User clicks mic icon
        ↓
   SpeechInput component
        ↓
   Moonshine.js (browser)
        ↓
   Transcribed text → onTranscription callback
        ↓
   (Optional) Auto-speak via TTS
        ↓
   speakText() → /api/speech/tts
        ↓
   Kokoro or Deepgram generates audio
        ↓
   Audio plays in browser
```

## Files Created/Modified

### New Files
- `/app/api/speech/tts/route.ts` — TTS API endpoint
- `/app/api/speech/stt/route.ts` — STT API endpoint
- `/lib/speech-api.ts` — Client utilities
- `/components/SpeechInput.tsx` — Speech input component
- `/components/SpeechSettings.tsx` — Settings panel component
- `/hooks/useSpeech.ts` — React hook for speech
- `/lib/speech/INTEGRATION.md` — Integration documentation

### Updated/Verified
- `/lib/speech/index.ts` — Already supports TTS routing
- `/lib/speech/kokoro.ts` — Server-side Kokoro TTS
- `/lib/speech/deepgram.ts` — Server-side Deepgram TTS
- `/lib/speech/types.ts` — Type definitions for voices
- `package.json` — `@moonshine-ai/moonshine-js` installed

## Supported Voices

### Kokoro (Default, Fast, Natural)
Female voices: `af_heart`, `af_alloy`, `af_aoede`, `af_bella`, `af_jessica`, `af_nicole`, `af_river`, `af_sarah`, `af_sky`

Male voices: `am_adam`, `am_echo`, `am_fable`, `am_fenrir`, `am_liam`, `am_michael`, `am_onyx`

### Deepgram (Premium)
`angus`, `asteria`, `arcas`, `orion`, `orpheus`, `athena`, `luna`, `zeus`, `perseus`, `helios`, `hera`, `stella`

## Performance Notes

- **First STT load:** ~150MB Moonshine model downloads to browser (cached for future use)
- **STT latency:** Real-time streaming transcription
- **TTS latency:** ~100-500ms server-side generation (cached)
- **Memory:** Moonshine runs in browser Web Worker (does not block UI)

## Environment Requirements

- Next.js 16+ (already in use)
- React 19+ (already in use)
- Node runtime for API routes (using `runtime = "nodejs"`)

Optional (for Deepgram):
- `DEEPGRAM_API_KEY` environment variable

## Browser Compatibility

- **STT (Moonshine):** Requires WebAssembly + WebGPU (fallback to WASM)
  - Chrome 91+, Firefox 90+, Safari 16.4+
  - Works on localhost and HTTPS
- **TTS:** Works in all modern browsers (audio playback)
- **Mic access:** Requires HTTPS or localhost

## Testing

### Test the TTS API
```bash
curl -X POST http://localhost:3000/api/speech/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","provider":"kokoro","voice":"af_heart"}' \
  -o output.wav
```

### Test the component in browser
```tsx
import { SpeechInput } from '@/components/SpeechInput';

export default function Page() {
  return (
    <SpeechInput
      onTranscription={(text) => {
        console.log('Transcribed:', text);
        alert(`You said: ${text}`);
      }}
      enableTTS={true}
    />
  );
}
```

## Troubleshooting

### Moonshine model not loading
- Check browser console for errors
- Ensure you're on HTTPS or localhost
- Check if `@moonshine-ai/moonshine-js` is in `node_modules`
- Try clearing browser cache and service workers

### Microphone permission denied
- Check browser mic permissions
- Ensure site is HTTPS (except localhost)
- Try a different browser

### TTS API not responding
- Test endpoint: `curl -X GET http://localhost:3000/api/speech/tts`
- Check server logs
- Verify `@huggingface/transformers` is installed

### Audio not playing
- Check browser console for errors
- Ensure audio context is not blocked by browser policy
- Try speaker volume settings

## Future Enhancements

- [ ] Streaming TTS (audio chunks as generated)
- [ ] Server-side STT fallback
- [ ] Multilingual support
- [ ] Custom voice training
- [ ] Audio analytics dashboard
- [ ] Voice activity detection (VAD) tuning
- [ ] Audio file upload for transcription

## Integration Points

### In Chat/Input Components
```tsx
<div className="flex gap-2">
  <SpeechInput onTranscription={(text) => setText(text)} />
  <input value={text} onChange={(e) => setText(e.target.value)} />
  <button onClick={() => send(text)}>Send</button>
</div>
```

### In Settings Pages
```tsx
<SpeechSettings onChange={(settings) => saveSpeechPreferences(settings)} />
```

### In Custom Components
```tsx
import { useSpeech } from '@/hooks/useSpeech';
import { speakText } from '@/lib/speech-api';

export function MyComponent() {
  const speech = useSpeech({ autoPlayFeedback: true });
  
  const handleResult = async (text: string) => {
    // Process text
    await speakText('Understood! Processing your request...');
  };
  
  return (/* ... */);
}
```

## Support

For issues or questions:
1. Check `lib/speech/INTEGRATION.md` for detailed examples
2. Review component props documentation in this file
3. Check browser console for errors
4. Test API endpoints directly with curl
5. Review Next.js API route behavior for errors

## License

Follows the project's existing license (rights.institute/PROSPER).

---

Last updated: 2026-07-20
