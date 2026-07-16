import { createMCPServersHandler } from "research-agent-ui/api";
import configManager from "@/lib/config";
import { getConfiguredMCPServers } from "@/lib/config/serverRegistry";

const handler = createMCPServersHandler({ configManager, getConfiguredMCPServers });
export const { GET, POST } = handler;
