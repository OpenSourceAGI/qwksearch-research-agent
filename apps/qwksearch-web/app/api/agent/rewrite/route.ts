/**
 * @fileoverview `/api/agent/rewrite` — the editor's writing assistant and the
 * chat window's "rewrite this message" button.
 *
 * `createGroq` + `GROQ_API_KEY` stays the default, but the route also hands the
 * handler the provider registry every other LLM route here loads its model
 * from. That is what keeps the endpoint answering on a deployment whose Groq
 * key is unset while some other provider is configured — the shape of a 500
 * seen on the Worker serving opensourceagi.app.
 */
import { createRewriteHandler } from "research-agent-ui/api";
import { getEnv } from "@/lib/config/env";
import { generateText, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import ModelRegistry from "chat-agent-toolkit/models/registry";

const handler = createRewriteHandler({
  getEnv,
  generateText,
  streamText,
  createGroq,
  loadChatModel: (chatModel) =>
    new ModelRegistry().loadChatModel(chatModel?.providerId, chatModel?.key),
});
export const { POST } = handler;
