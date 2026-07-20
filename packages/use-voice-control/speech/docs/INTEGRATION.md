# Speech API Integration Guide

This document explains how to integrate the new TTS/STT APIs with the existing speech library.

## Overview

The speech system now has three layers:

1. **API Layer** (`/app/api/speech/*`) — Server-side endpoints for TTS and STT
2. **Client Utilities** (`lib/speech-api.ts`) — High-level functions for frontend use
3. **Components** (`components/SpeechInput.tsx`, `components/SpeechSettings.tsx`) — Ready-to-use UI

## Architecture

```
┌─────────────────────────────────────────┐
│      React Components (UI Layer)        │
│  ┌────────────────────────────────────┐ │
│  │  SpeechInput (STT + TTS playback)  │ │
│  │  SpeechSettings (Configuration)    │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Client Utilities (lib/speech-api)  │
│  ┌────────────────────────────────────┐ │
│  │  generateSpeechFromText()           │ │
│  │  createAudioURL()                   │ │
│  │  speakText()                        │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Next.js API Routes              │
│  ┌────────────────────────────────────┐ │
│  │  POST /api/speech/tts              │ │
│  │  GET|POST /api/speech/stt          │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Speech Libraries & Models          │
│  ┌────────────────────────────────────┐ │
│  │  Kokoro TTS (Node.js via lib)      │ │
│  │  Deepgram TTS (API)                │ │
│  │  Moonshine STT (Browser-side)      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Usage

### Basic Speech Input (STT only)

```tsx
'use client';

import { SpeechInput } from '@/components/SpeechInput';

export function MyComponent() {
  const handleTranscription = (text: string) => {
    console.log('Transcribed:', text);
    // Do something with the text
  };

  return (
    <SpeechInput 
      onTranscription={handleTranscription}
    />
  );
}
```

### With TTS Feedback

```tsx
import { SpeechInput } from '@/components/SpeechInput';

export function MyComponent() {
  return (
    <SpeechInput 
      onTranscription={(text) => console.log(text)}
      enableTTS={true}
      ttsProvider="kokoro"
      ttsVoice="af_heart"
    />
  );
}
```

### With Settings Panel

```tsx
'use client';

import { useState } from 'react';
import { SpeechInput } from '@/components/SpeechInput';
import { SpeechSettings, type SpeechSettings } from '@/components/SpeechSettings';

export function MyComponent() {
  const [settings, setSettings] = useState<SpeechSettings>({
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

### Direct API Usage

```tsx
import { generateSpeechFromText, speakText, createAudioURL } from '@/lib/speech-api';

// Generate audio blob
const audioBlob = await generateSpeechFromText(
  'Hello, world!',
  'kokoro',
  'af_heart'
);

// Create object URL for <audio> element
const url = await createAudioURL('Hello, world!');

// Play audio and wait for completion
await speakText('Hello, world!', 'kokoro', 'af_heart');
```

## API Endpoints

### POST /api/speech/tts

Generates speech audio from text.

**Request:**
```json
{
  "text": "Hello, world!",
  "provider": "kokoro",
  "voice": "af_heart"
}
```

**Response:**
- 200: Audio data (binary)
- 400: Invalid text parameter
- 500: TTS generation failed

**Headers:**
- `Content-Type`: `audio/wav` or `audio/mpeg`
- `Cache-Control`: `public, max-age=31536000`

### GET /api/speech/stt

Returns STT API documentation.

**Response:**
```json
{
  "message": "STT (Speech-to-Text) API",
  "description": "Transcription happens client-side using Moonshine.js",
  "models": ["moonshine-small"],
  "note": "For client-side transcription, import SpeechInput component"
}
```

### POST /api/speech/stt

Server-side transcription (future implementation).

Currently returns 501 Not Implemented.

## Configuration

### Environment Variables

No environment variables are required for client-side Moonshine STT.

For Deepgram TTS, set:
```
DEEPGRAM_API_KEY=xxx
```

### Component Props

#### SpeechInput

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onTranscription` | `(text: string) => void` | Required | Callback when transcription is complete |
| `disabled` | `boolean` | `false` | Disable the microphone button |
| `enableTTS` | `boolean` | `false` | Auto-play TTS for transcribed text |
| `ttsProvider` | `'kokoro' \| 'deepgram'` | `'kokoro'` | Which TTS provider to use |
| `ttsVoice` | `string` | `'af_heart'` | Voice ID for TTS |

#### SpeechSettings

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onChange` | `(settings: SpeechSettings) => void` | `undefined` | Callback when settings change |

## Voices

### Kokoro Voices

Default provider with natural-sounding voices:
- Female: `af_heart`, `af_alloy`, `af_aoede`, `af_bella`, `af_jessica`, `af_nicole`, `af_river`, `af_sarah`, `af_sky`
- Male: `am_adam`, `am_echo`, `am_fable`, `am_fenrir`, `am_liam`, `am_michael`, `am_onyx`

### Deepgram Speakers

Premium provider with distinct personalities:
- `angus`, `asteria`, `arcas`, `orion`, `orpheus`, `athena`, `luna`, `zeus`, `perseus`, `helios`, `hera`, `stella`

## Troubleshooting

### Model Download Issues

The first time Moonshine runs, it downloads the model (~150MB). This is cached in the browser.

To debug:
```tsx
console.log('Model loading...');
const Moonshine = await import('@moonshine-ai/moonshine-js');
console.log('Model loaded');
```

### Microphone Permission Denied

The browser will prompt for microphone access on first use. If denied:
1. Check browser settings
2. Ensure the site is running on HTTPS (localhost OK)
3. Clear site permissions and retry

### TTS API Failures

Check:
1. Is `/api/speech/tts` responding? Test with: `curl -X POST http://localhost:3000/api/speech/tts -H "Content-Type: application/json" -d '{"text":"hello"}'`
2. Are model dependencies installed? Check `node_modules/@huggingface/transformers`
3. Check server logs for errors

### Performance Tips

- Moonshine model loads on first STT use; consider preloading with `<link rel="preload">`
- TTS audio is cached server-side; repeated requests are instant
- For high-frequency TTS, store generated audio URLs in a client-side cache

## Future Enhancements

- [ ] Server-side Moonshine STT as fallback
- [ ] Streaming TTS (audio chunks as they're generated)
- [ ] Voice activity detection (VAD) tuning
- [ ] Audio analytics and error reporting
- [ ] Multilingual STT/TTS support

## Files

- `/app/api/speech/tts/route.ts` — TTS endpoint
- `/app/api/speech/stt/route.ts` — STT endpoint (documentation only)
- `/lib/speech-api.ts` — Client utilities
- `/components/SpeechInput.tsx` — Speech input component
- `/components/SpeechSettings.tsx` — Configuration component
- `/lib/speech/*` — Core speech library (Kokoro, Deepgram, types)
