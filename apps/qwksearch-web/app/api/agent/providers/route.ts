import { createProvidersHandler } from "research-agent-ui/api";
import { getSession } from "@/lib/auth/agent-session";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createProvidersHandler({ getSession });
export const GET = withCors(handler.GET);
export const POST = withCors(handler.POST);
export const OPTIONS = corsPreflight;
