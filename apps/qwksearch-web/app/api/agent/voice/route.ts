import { createVoiceHandler } from "research-agent-ui/api";
import { getUserId } from "@/lib/auth/session";
import { checkTTSRateLimit } from "@/lib/rate-limit/guestRateLimiter";
import { generateSpeech } from "@/lib/speech";

export const runtime = "nodejs";

const handler = createVoiceHandler({ getUserId, checkTTSRateLimit, generateSpeech });
export const { POST } = handler;
