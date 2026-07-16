import { createProviderModelsHandler } from "research-agent-ui/api";

const handler = createProviderModelsHandler();
export const { POST, DELETE } = handler;
