import { createValidateOpenRouterHandler } from "research-agent-ui/api";
import { validateOpenRouterModels } from "@/lib/utils/validate-openrouter-models";

export const runtime = "nodejs";
export const maxDuration = 300;

const handler = createValidateOpenRouterHandler({ validateOpenRouterModels });
export const { GET, POST } = handler;
