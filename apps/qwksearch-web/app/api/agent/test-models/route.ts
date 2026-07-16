import { createTestModelsHandler } from "research-agent-ui/api";

export const runtime = "nodejs";
export const maxDuration = 300;

const handler = createTestModelsHandler();
export const { POST } = handler;
