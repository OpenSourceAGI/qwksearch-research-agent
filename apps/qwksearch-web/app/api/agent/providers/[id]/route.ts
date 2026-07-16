import { createProviderByIdHandler } from "research-agent-ui/api";

const handler = createProviderByIdHandler();
export const { DELETE, PATCH } = handler;
