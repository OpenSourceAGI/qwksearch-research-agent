import { createMCPServerByIdHandler } from "research-agent-ui/api";
import configManager from "@/lib/config";
import { getConfiguredMCPServers } from "@/lib/config/serverRegistry";

const handler = createMCPServerByIdHandler({ configManager, getConfiguredMCPServers });
export const { DELETE, PATCH } = handler;
