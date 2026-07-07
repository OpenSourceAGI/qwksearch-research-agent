# Speech Library

Unified text-to-speech API supporting Kokoro (default) and Deepgram providers.

## Features

- **Kokoro** (default): Fast, natural-sounding voices, runs on Node CPU
- **Deepgram**: Requires Cloudflare AI binding, returns MP3

## Usage

### API Endpoint

**POST** `/api/agent/voice`

```json
{
  "text": "Hello world",
  "provider": "kokoro",
  "voice": "af_heart"
}
```

**Request Body:**
- `text` (required): Text to convert to speech (max 5000 chars)
- `provider` (optional): `"kokoro"` (default) or `"deepgram"`
- `voice` (optional): Voice ID (see below)

**Response:** Audio file (WAV for Kokoro, MP3 for Deepgram)

### Direct Library Usage

```ts
import { generateSpeech } from "@/lib/speech";

// Kokoro (default)
const audio = await generateSpeech({
  text: "Hello world",
  voice: "af_heart"
});

// Deepgram
const audio = await generateSpeech({
  text: "Hello world",
  provider: "deepgram",
  voice: "angus"
});

// Returns
{
  audio: ArrayBuffer,
  contentType: "audio/wav" | "audio/mpeg"
}
```

## Voices

### Kokoro Voices (Default)

**Female:**
- `af_heart` - Default, warm and natural
- `af_alloy` - Clear and professional
- `af_aoede` - Soft and expressive
- `af_bella` - Bright and friendly
- `af_jessica` - Calm and steady
- `af_nicole` - Smooth and confident
- `af_river` - Cool and relaxed
- `af_sarah` - Warm and approachable
- `af_sky` - Light and airy

**Male:**
- `am_adam` - Strong and authoritative
- `am_echo` - Deep and resonant
- `am_fable` - Storytelling quality
- `am_fenrir` - Bold and commanding
- `am_liam` - Friendly and casual
- `am_michael` - Professional and clear
- `am_onyx` - Smooth and sophisticated

### Deepgram Aura Voices

- `angus` (default), `asteria`, `arcas`, `orion`, `orpheus`, `athena`
- `luna`, `zeus`, `perseus`, `helios`, `hera`, `stella`

## Architecture

```
lib/speech/
├── index.ts       # Main API
├── types.ts       # Shared types
├── kokoro.ts      # Kokoro provider
└── deepgram.ts    # Deepgram provider
```

### Model Loading

Kokoro model is lazy-loaded once per server instance:
- Model: `onnx-community/Kokoro-82M-v1.0-ONNX`
- Quantization: `q8` (8-bit)
- Device: `cpu`
- First request triggers download (~82MB)
- Subsequent requests reuse loaded model

### Rate Limiting

- Guests: 10 requests per day
- Authenticated users: Unlimited
- Enforced at API route level

## Performance

**Kokoro:**
- Fast CPU inference
- Natural prosody and intonation
- WAV output (higher quality)
- ~100-300ms generation time

**Deepgram:**
- Cloudflare Workers AI
- Lower latency in edge locations
- MP3 output (smaller size)
- Requires CF binding

## Error Handling

```ts
try {
  const audio = await generateSpeech({ text: "..." });
} catch (error) {
  // "Text is required"
  // "Unknown TTS provider: ..."
  // "Cloudflare AI binding not available"
}
```

## Migration from Old API

**Before:**
```json
{
  "text": "Hello",
  "speaker": "angus"
}
```

**After (same behavior):**
```json
{
  "text": "Hello",
  "provider": "deepgram",
  "voice": "angus"
}
```

**Now (Kokoro default):**
```json
{
  "text": "Hello",
  "voice": "af_heart"
}
```

## References

- [kokoro-js npm](https://www.npmjs.com/package/kokoro-js)
- [Kokoro ONNX Model](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
- [Deepgram Aura](https://developers.cloudflare.com/workers-ai/models/deepgram-aura/)
