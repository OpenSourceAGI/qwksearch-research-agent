# TTS Quick Start

## 5-Second Summary

Text-to-speech with **Kokoro** (default, faster, better quality) or **Deepgram** (Cloudflare AI).

## API Call

```bash
curl -X POST http://localhost:3000/api/agent/voice \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' \
  --output speech.wav
```

## React Component

```tsx
import { useState } from "react";

export function TextToSpeech() {
  const [audio, setAudio] = useState<string | null>(null);

  const speak = async (text: string) => {
    const res = await fetch("/api/agent/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const blob = await res.blob();
    setAudio(URL.createObjectURL(blob));
  };

  return (
    <div>
      <button onClick={() => speak("Hello world")}>
        Speak
      </button>
      {audio && <audio controls src={audio} autoPlay />}
    </div>
  );
}
```

## Request Body

```ts
{
  text: string;          // Required, max 5000 chars
  provider?: "kokoro" | "deepgram";  // Default: kokoro
  voice?: string;        // Default: af_heart
}
```

## Top 5 Voices

**Kokoro (default):**
- `af_heart` - Warm female (default)
- `af_alloy` - Professional female
- `am_adam` - Strong male
- `am_echo` - Deep male
- `af_sarah` - Friendly female

**Deepgram:**
- `angus` - Default male
- `asteria` - Default female
- `luna` - Warm female
- `perseus` - Deep male
- `athena` - Professional female

## Switch Provider

```ts
// Use Deepgram instead
fetch("/api/agent/voice", {
  method: "POST",
  body: JSON.stringify({
    text: "Hello",
    provider: "deepgram",
    voice: "angus"
  })
});
```

## Full Voice Lists

**Kokoro (16 voices):**
```ts
const KOKORO_VOICES = [
  "af_heart", "af_alloy", "af_aoede", "af_bella",
  "af_jessica", "af_nicole", "af_river", "af_sarah", "af_sky",
  "am_adam", "am_echo", "am_fable", "am_fenrir",
  "am_liam", "am_michael", "am_onyx"
];
```

**Deepgram (12 voices):**
```ts
const DEEPGRAM_VOICES = [
  "angus", "asteria", "arcas", "orion", "orpheus", "athena",
  "luna", "zeus", "perseus", "helios", "hera", "stella",
];
```

## Rate Limits

- **Guests**: 10 requests/day
- **Authenticated**: Unlimited

## Error Handling

```ts
const res = await fetch("/api/agent/voice", {
  method: "POST",
  body: JSON.stringify({ text: "Hello" })
});

if (!res.ok) {
  const error = await res.json();
  console.error(error.error);
  // "text is required"
  // "Daily TTS limit reached (10/day)"
  // "Cloudflare AI binding not available"
}
```

## Direct Library Usage

```ts
import { generateSpeech } from "@/lib/speech";

const audio = await generateSpeech({
  text: "Hello world",
  voice: "af_heart"
});

// Returns: { audio: ArrayBuffer, contentType: "audio/wav" }
```

## Test It

```bash
# Install dependencies
cd apps/qwksearch-web
bun install

# Run test script
npx tsx lib/speech/test.ts

# Play output
test-output.wav
```

## Next Steps

- 📖 Full docs: [README.md](./README.md)
- 🔄 Migration: [MIGRATION.md](./MIGRATION.md)
- 💻 Example: [client-example.tsx](./client-example.tsx)
