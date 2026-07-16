import { createProvidersHandler } from "research-agent-ui/api";
import { getSession } from "@/lib/auth/session";

const handler = createProvidersHandler({ getSession });
export const { GET, POST } = handler;
