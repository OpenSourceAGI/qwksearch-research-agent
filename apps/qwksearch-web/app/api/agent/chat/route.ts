/**
 * @fileoverview Streaming chat endpoint. POST delegates to the research-agent
 * chat handler which orchestrates web search, source retrieval, and
 * LLM-powered response generation with streaming output.
 */
import { handleChatRequest } from "@/lib/chat";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withCors(handleChatRequest);
export const OPTIONS = corsPreflight;
