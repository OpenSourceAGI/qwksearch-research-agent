# Speech Library Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  • React Components (client-example.tsx)                     │
│  • Browser Audio APIs                                        │
│  • Fetch API                                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST
                       │ /api/agent/voice
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Route Layer                         │
├─────────────────────────────────────────────────────────────┤
│  app/api/agent/voice/route.ts                               │
│  • Request validation                                        │
│  • Rate limiting (10/day guests)                            │
│  • Error handling                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ generateSpeech()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Speech Library Core                        │
├─────────────────────────────────────────────────────────────┤
│  lib/speech/index.ts                                        │
│  • Provider routing                                          │
│  • Input normalization                                       │
│  • Unified interface                                         │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               │                      │
       ┌───────▼────────┐    ┌───────▼────────┐
       │                 │    │                 │
       │  Kokoro Provider│    │Deepgram Provider│
       │                 │    │                 │
       │  kokoro.ts      │    │  deepgram.ts   │
       │                 │    │                 │
       └────────┬────────┘    └────────┬────────┘
                │                      │
                │                      │
        ┌───────▼────────┐    ┌────────▼────────┐
        │                 │    │                  │
        │   kokoro-js     │    │ Cloudflare AI    │
        │   (Node CPU)    │    │   Workers AI     │
        │                 │    │                  │
        │  • ONNX Runtime │    │  • Deepgram Aura │
        │  • 82M params   │    │  • MP3 encoder   │
        │  • WAV output   │    │                  │
        └─────────────────┘    └──────────────────┘
```

## Data Flow

### Request Flow
```
1. Client sends POST /api/agent/voice
   {
     "text": "Hello world",
     "provider": "kokoro",
     "voice": "af_heart"
   }

2. API Route validates & rate-limits
   ↓
3. Calls generateSpeech()
   ↓
4. Routes to kokoro.ts or deepgram.ts
   ↓
5. Provider generates audio
   ↓
6. Returns { audio: ArrayBuffer, contentType: string }
   ↓
7. API Route streams audio to client
```

### Response Flow
```
HTTP 200 OK
Content-Type: audio/wav (Kokoro) or audio/mpeg (Deepgram)
Cache-Control: public, max-age=86400
Content-Disposition: inline; filename="speech.wav"

[Binary audio data]
```

## Module Dependencies

```
route.ts
├── @/lib/speech (unified interface)
│   ├── types.ts (shared types)
│   ├── kokoro.ts
│   │   └── kokoro-js (npm package)
│   │       └── onnxruntime-web
│   └── deepgram.ts
│       └── @/lib/cloudflare-context
├── @/lib/auth/session (getUserId)
└── @/lib/rate-limit/guestRateLimiter
```

## Type System

```ts
// Core types
type TTSProvider = "kokoro" | "deepgram";

interface TTSOptions {
  text: string;
  provider?: TTSProvider;
  voice?: string;
}

interface TTSResult {
  audio: ArrayBuffer;
  contentType: string;
}

// Voice types
type KokoroVoice = "af_heart" | "af_alloy" | ... (16 total)
type DeepgramSpeaker = "angus" | "asteria" | ... (12 total)
```

## State Management

### Kokoro Model Loading
```ts
let ttsInstance: KokoroTTS | null = null;
let modelLoading: Promise<KokoroTTS> | null = null;

// Lazy singleton pattern
async function getKokoroTTS() {
  if (ttsInstance) return ttsInstance;
  if (modelLoading) await modelLoading;
  
  modelLoading = KokoroTTS.from_pretrained(...);
  ttsInstance = await modelLoading;
  modelLoading = null;
  
  return ttsInstance;
}
```

**Benefits:**
- Model loads once per server instance
- Concurrent requests wait for single download
- No memory leaks or duplicate loads

### Rate Limiting State
```ts
// In-memory counter per IP/userId
const rateLimitMap = new Map<string, {
  count: number;
  resetAt: number;
}>();
```

## Error Handling

```
┌─────────────────────────────────────┐
│         Error Categories             │
├─────────────────────────────────────┤
│                                      │
│  1. Client Errors (400)              │
│     • Missing text                   │
│     • Invalid JSON                   │
│                                      │
│  2. Rate Limiting (429)              │
│     • Daily limit exceeded           │
│                                      │
│  3. Provider Errors (503)            │
│     • Model loading failed (Kokoro)  │
│     • CF binding missing (Deepgram)  │
│                                      │
│  4. Runtime Errors (500)             │
│     • Generation failed              │
│     • Unknown errors                 │
│                                      │
└─────────────────────────────────────┘
```

## Performance Characteristics

### Kokoro
```
First Request:
  Model Download: ~2-3s (82MB, one-time)
  Generation: ~100-300ms
  Total: ~2-3s

Subsequent Requests:
  Generation: ~100-300ms
  (No network calls)
```

### Deepgram
```
All Requests:
  Network RTT: ~50-200ms
  Generation: ~200-400ms
  Total: ~300-500ms
  (Depends on edge location)
```

## Deployment Considerations

### Development
```yaml
Environment: Node.js
Model Storage: ~/.cache/huggingface/
Network: Required for first Kokoro download
Cloudflare: Optional (Deepgram won't work)
```

### Production
```yaml
Build:
  - No prebuild needed
  - Model downloads on first request
  
Runtime:
  - Node.js (not Edge)
  - CPU: 2+ cores recommended
  - RAM: 512MB+ for Kokoro model
  - Disk: 100MB for cached model
  
Cloudflare Workers:
  - Deepgram requires AI binding
  - Kokoro requires Node runtime
```

## Security

### Rate Limiting
```ts
// IP-based for guests
const rateLimitKey = 
  userId ??
  req.headers.get("x-forwarded-for")?.split(",")[0] ??
  req.headers.get("x-real-ip") ??
  "unknown";
```

### Input Sanitization
```ts
// Max length enforcement
text: text.slice(0, 5000)

// Type validation
if (!text || typeof text !== "string" || text.trim().length === 0) {
  throw new Error("Text is required");
}

// Voice validation
const voice = VOICES.includes(requested) ? requested : DEFAULT;
```

### Headers
```ts
// Cache control
"Cache-Control": "public, max-age=86400"

// Content type enforcement
"Content-Type": result.contentType  // Never user-controlled

// Safe filename
"Content-Disposition": `inline; filename="speech.${ext}"`
```

## Testing Strategy

### Unit Tests
```ts
// test.ts - Basic functionality
- Model loading
- Voice generation
- File output
```

### Integration Tests
```bash
# API endpoint
curl -X POST /api/agent/voice -d '{"text":"test"}'

# Expected: 200 OK, audio/wav
```

### Load Tests
```bash
# Concurrent requests (model singleton)
ab -n 100 -c 10 http://localhost:3000/api/agent/voice

# Expected: All requests succeed, first is slower
```

## Future Enhancements

### Potential Improvements
1. **Streaming Audio**: Chunked transfer encoding
2. **Voice Cloning**: Custom voice training
3. **SSML Support**: Prosody control
4. **Multi-language**: International voices
5. **Caching**: Redis for repeated phrases
6. **Metrics**: Prometheus exports
7. **A/B Testing**: Quality comparisons

### Provider Additions
- **ElevenLabs**: Ultra-realistic voices
- **Azure TTS**: Enterprise features
- **Google Cloud TTS**: WaveNet quality
- **AWS Polly**: Neural voices

## Monitoring

### Key Metrics
```ts
// Track these in production
- Request rate (req/s)
- Error rate (%)
- P50/P95/P99 latency (ms)
- Provider distribution (kokoro vs deepgram)
- Cache hit rate (if implemented)
- Model load time (first request)
- Rate limit hits (per user)
```

### Logging
```ts
console.log("[TTS]", {
  provider,
  voice,
  textLength: text.length,
  userId,
  latency: Date.now() - start,
  error: error?.message,
});
```

## References

- [Kokoro Model](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
- [kokoro-js](https://www.npmjs.com/package/kokoro-js)
- [Deepgram Aura](https://developers.cloudflare.com/workers-ai/models/deepgram-aura/)
- [ONNX Runtime](https://onnxruntime.ai/)
