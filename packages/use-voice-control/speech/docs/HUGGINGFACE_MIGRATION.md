# Kokoro TTS Migration: kokoro-js → Hugging Face Transformers

## Overview

Kokoro TTS has been migrated from the `kokoro-js` package to use Hugging Face transformers library loaded from CDN, providing better flexibility and potentially improved performance.

## What Changed

### Browser Implementation (Client-Side)
- **Before**: Used `kokoro-js` npm package
- **After**: Uses Hugging Face transformers loaded from CDN (`https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js`)

### New Files Created

1. **KokoroTTS.js** - Main TTS class implementing audio generation
   - Loads model and tokenizer from Hugging Face Hub
   - Generates phonemes from text
   - Applies voice styling
   - Produces audio output

2. **main.js** - Main entry point for browser TTS
   - Manages Web Worker for model loading
   - Handles text-to-speech requests
   - Provides `textToSpeech()` function
   - Cleans markdown formatting from input text

3. **worker.js** - Web Worker for model management
   - Loads TTS model in background thread
   - Handles audio generation without blocking UI
   - Communicates via message passing

4. **AudioPlayer.js** - Audio playback system
   - Web Audio API integration
   - Audio queuing and playback
   - WAV format conversion
   - RawAudio class for handling audio buffers

5. **phonemize.js** - Text-to-phoneme conversion
   - Converts input text to phonetic representation
   - Language-specific processing (English/other)
   - Can be extended with g2p-en library for better phonemization

6. **voices.js** - Voice definitions and data management
   - Voice catalog with metadata
   - Voice data caching
   - Fetches voice embeddings from Hugging Face

### Updated Files

1. **kokoro.ts** - Server-side TTS (apps/qwksearch-web)
   - Updated to use Hugging Face transformers
   - Currently shows placeholder (server-side needs additional setup)

2. **kokoro.ts** - React client integration (packages/research-agent-ui)
   - Updated imports to use Hugging Face transformers directly
   - Simplified backend selection logic
   - Removed kokoro-js specific handling

## Model Details

- **Model**: `hexgrad/Kokoro-82M` (on Hugging Face Hub)
- **Format**: Transformers compatible
- **Backend**: WASM by default, WebGPU if available
- **Sample Rate**: 24000 Hz
- **Voice Style Dimension**: 256

## Usage

### Browser Usage

```javascript
import { textToSpeech, ttsModelReadyPromise } from './main.js';

// Wait for model to load
await ttsModelReadyPromise;

// Generate and play speech
textToSpeech("Hello, world!", "af_heart");
```

### React Component

```typescript
import { preloadKokoro, getKokoro } from '@lib/kokoro';

// Preload model
await preloadKokoro();

// Generate speech
const tts = await getKokoro();
const audio = await tts.generate("Hello, world!", { voice: "af_heart" });
```

## Available Voices

### Female Voices (English)
- `af`, `af_heart`, `af_alloy`, `af_aoede`, `af_bella`
- `af_jessica`, `af_nicole`, `af_river`, `af_sarah`, `af_sky`

### Male Voices (English)
- `am`, `am_adam`, `am_echo`, `am_fable`, `am_fenrir`
- `am_liam`, `am_michael`, `am_onyx`

### Other Languages
- `bf`, `bm` (language variant 'b')

## Backend Performance

### WASM (Default)
- More compatible
- Lower memory usage
- Slightly slower
- Quantized to q8 for smaller model size

### WebGPU (Fallback to WASM if unavailable)
- Faster on supported hardware
- Requires modern GPU support
- Full precision (fp32)

## Dependencies

### Browser
- Hugging Face transformers library (CDN)
- Web Audio API support

### Node.js (Future)
- `@huggingface/transformers` npm package
- Additional setup required for server-side TTS

## Migration Checklist

- [x] Create KokoroTTS class using HF transformers
- [x] Implement browser-based audio generation
- [x] Create Web Worker for background loading
- [x] Implement audio playback
- [x] Create supporting modules (phonemize, voices, AudioPlayer)
- [x] Update React client integration
- [x] Update Node.js server-side file

## Next Steps

1. **Testing**: Test audio generation with various voices and texts
2. **Phonemization**: Consider using `g2p-en` library for better phoneme accuracy
3. **Voice Data**: Verify voice embedding data loading from Hugging Face
4. **Server-Side**: Implement server-side TTS if needed
5. **Performance**: Monitor and optimize model loading time
6. **Fallback**: Ensure Deepgram fallback still works if Kokoro fails

## Known Limitations

- Voice data fetching requires internet connectivity
- Large model size (may cause initial load delay)
- Phonemization is simplified (could be improved with g2p-en)
- Server-side implementation placeholder (requires more work)

## Troubleshooting

### Model fails to load
- Check browser GPU/WASM support
- Verify Hugging Face Hub connectivity
- Try refreshing the page
- Check browser console for detailed error messages

### Audio playback issues
- Ensure Web Audio API is available
- Check audio context state
- Verify speaker/audio output devices

### Voice not found errors
- Use valid voice keys from the VOICES object
- Check for typos in voice name
- See Available Voices section above
