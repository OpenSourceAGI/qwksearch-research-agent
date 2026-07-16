import { createMCPServerToggleHandler } from "research-agent-ui/api";
import configManager from "@/lib/config";
import { getConfiguredMCPServers } from "@/lib/config/serverRegistry";

const handler = createMCPServerToggleHandler({ configManager, getConfiguredMCPServers });
export const { POST } = handler;
