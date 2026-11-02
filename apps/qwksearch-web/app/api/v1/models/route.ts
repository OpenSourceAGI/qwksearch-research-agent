/**
 * OpenAI-compatible model discovery for speech-to-text clients (Kilo's
 * "Speech to Text Base URL" is `https://qwksearch.com/api/v1`). Lists the
 * transcription tiers `/api/v1/audio/transcriptions` accepts.
 */
import { createOpenAIModelsHandler } from "research-agent-ui/api";
import { authorizeBearerApiKey } from "@/lib/auth/bearer-api-key";
import { withCors, corsPreflight } from "@/lib/cors";

const { GET: handleGet } = createOpenAIModelsHandler({ authorize: authorizeBearerApiKey });

// The handler checks the key itself, and always — skip `withCors`'s optional check.
export const GET = withCors((req?: Request) => handleGet(req!), { skipApiKeyCheck: true });
export const OPTIONS = corsPreflight;
