/**
 * OpenAI-compatible speech-to-text (`POST /v1/audio/transcriptions`) for Kilo
 * and similar clients. Runs the same `transcribeAudio` as
 * `/api/agent/transcript` — no HTTP hop back into this app — and answers
 * `{ text }`. Requires a QwkSearch API key as `Authorization: Bearer`.
 */
import { createOpenAITranscriptionHandler } from "research-agent-ui/api";
import { getCloudflareContext } from "@/lib/cloudflare/context";
import { authorizeBearerApiKey } from "@/lib/auth/bearer-api-key";
import { withCors, corsPreflight } from "@/lib/cors";

const { POST: handlePost } = createOpenAITranscriptionHandler({
  getCloudflareContext,
  authorize: authorizeBearerApiKey,
});

// The handler checks the key itself, and always — skip `withCors`'s optional check.
export const POST = withCors((req?: Request) => handlePost(req!), { skipApiKeyCheck: true });
export const OPTIONS = corsPreflight;
