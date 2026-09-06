import { createSuggestionsHandler } from "research-agent-ui/api";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createSuggestionsHandler();
export const POST = withCors(handler.POST);
export const OPTIONS = corsPreflight;
