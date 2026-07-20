# TTS Migration Guide

## Changes Summary

The voice API has been refactored from a Deepgram-only implementation to a unified speech library supporting both **Kokoro** (default) and **Deepgram** providers.

### What Changed

**Before:**
```ts
// app/api/agent/voice/route.ts
// Hardcoded Deepgram via Cloudflare Workers AI
const result = await ai.run("@cf/deepgram/aura-1", {
  text,
  speaker: "angus",
  encoding: "mp3",
});
```

**After:**
```ts
// lib/speech/index.ts - Unified API
const result = await generateSpeech({
  text: "Hello world",
  provider: "kokoro",  // or "deepgram"
  voice: "af_heart",
});
```

## New Features

### 1. Kokoro Provider (Default)
- **Faster**: CPU-based inference, no network dependency
- **Higher Quality**: More natural prosody and intonation
- **16 Voices**: 9 female, 7 male
- **WAV Output**: Lossless audio
- **Model**: `onnx-community/Kokoro-82M-v1.0-ONNX`

### 2. Deepgram Provider (Legacy)
- **Edge-optimized**: Cloudflare Workers AI
- **12 Voices**: Aura speakers
- **MP3 Output**: Smaller file size
- **Requires**: Cloudflare AI binding

## API Changes

### Request Format

**Backward Compatible** - Old requests still work:
```json
{
  "text": "Hello",
  "speaker": "angus"
}
```

**New Format** (recommended):
```json
{
  "text": "Hello world",
  "provider": "kokoro",
  "voice": "af_heart"
}
```

### Response

**Headers:**
- `Content-Type`: `audio/wav` (Kokoro) or `audio/mpeg` (Deepgram)
- `Cache-Control`: `public, max-age=86400`
- `Content-Disposition`: `inline; filename="speech.wav"`

**Body:** Audio buffer

## Breaking Changes

### None!

The API maintains backward compatibility:
- `speaker` field still works (alias for `voice`)
- Omitting `provider` defaults to Kokoro
- Old Deepgram requests work by specifying `provider: "deepgram"`

## Migration Path

### For Existing Clients

**Option 1: No changes (use Kokoro automatically)**
```ts
// No code changes needed - automatically uses Kokoro
fetch("/api/agent/voice", {
  method: "POST",
  body: JSON.stringify({ text: "Hello" })
});
```

**Option 2: Keep using Deepgram**
```ts
// Explicitly request Deepgram
fetch("/api/agent/voice", {
  method: "POST",
  body: JSON.stringify({
    text: "Hello",
    provider: "deepgram",
    voice: "angus"
  })
});
```

**Option 3: Switch to Kokoro (recommended)**
```ts
fetch("/api/agent/voice", {
  method: "POST",
  body: JSON.stringify({
    text: "Hello",
    provider: "kokoro",
    voice: "af_heart"
  })
});
```

## File Structure

```
lib/speech/
├── index.ts              # Main API
├── types.ts              # Shared types & voice lists
├── kokoro.ts             # Kokoro provider
├── deepgram.ts           # Deepgram provider
├── README.md             # Documentation
├── MIGRATION.md          # This file
├── client-example.tsx    # React component example
└── test.ts               # Test script
```

## Testing

### Run Test Script
```bash
cd apps/qwksearch-web
npx tsx lib/speech/test.ts
# Creates test-output.wav
```

### Test API Endpoint
```bash
curl -X POST http://localhost:3000/api/agent/voice \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from Kokoro", "provider": "kokoro", "voice": "af_heart"}' \
  --output test.wav
```

## Performance Comparison

| Metric | Kokoro | Deepgram |
|--------|--------|----------|
| First request | ~2-3s (model download) | ~500ms |
| Subsequent | ~100-300ms | ~500ms |
| Quality | ★★★★★ | ★★★★☆ |
| File size | Larger (WAV) | Smaller (MP3) |
| Dependencies | Node CPU | Cloudflare AI |

## Voice Mapping

### Kokoro → Deepgram Equivalents

| Use Case | Kokoro | Deepgram |
|----------|--------|----------|
| Default female | `af_heart` | `asteria` |
| Professional female | `af_alloy` | `athena` |
| Warm female | `af_sarah` | `luna` |
| Default male | `am_adam` | `angus` |
| Deep male | `am_echo` | `perseus` |
| Storyteller | `am_fable` | `orpheus` |

## Troubleshooting

### "Kokoro model loading failed"
- Check disk space (~82MB needed)
- Verify network access to Hugging Face
- Check logs: `console.log` shows model load progress

### "Cloudflare AI binding not available"
- Expected in local dev without Wrangler
- Use Kokoro instead: `provider: "kokoro"`
- For Deepgram, run: `vinext dev`

### WAV files not playing
- Browser support: All modern browsers support WAV
- Try converting to MP3: `ffmpeg -i speech.wav speech.mp3`
- Or use Deepgram provider for native MP3

## Environment Variables

None required! Both providers work out-of-the-box:
- **Kokoro**: Downloads model automatically
- **Deepgram**: Uses Cloudflare AI binding (in prod)

## Rollback

To revert to Deepgram-only:

1. Remove Kokoro dependency:
   ```bash
   bun remove kokoro-js
   ```

2. Restore old route:
   ```bash
   git checkout HEAD -- app/api/agent/voice/route.ts
   ```

3. Delete speech lib:
   ```bash
   rm -rf lib/speech
   ```

## Questions?

See `lib/speech/README.md` for detailed documentation.
