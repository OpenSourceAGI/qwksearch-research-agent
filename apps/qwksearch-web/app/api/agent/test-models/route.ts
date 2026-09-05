import { createTestModelsHandler } from "research-agent-ui/api";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 300;

const handler = createTestModelsHandler();
export const POST = withCors(handler.POST);
export const OPTIONS = corsPreflight;
