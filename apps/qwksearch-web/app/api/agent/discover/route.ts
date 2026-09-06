import { createDiscoverHandler } from "research-agent-ui/api";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createDiscoverHandler();
export const GET = withCors(handler.GET);
export const OPTIONS = corsPreflight;
