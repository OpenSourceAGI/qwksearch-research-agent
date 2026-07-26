import { createRewriteHandler } from "research-agent-ui/api";
import { getEnv } from "@/lib/config/env";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const handler = createRewriteHandler({ getEnv, generateText, createGroq });
export const { POST } = handler;
