/**
 * @fileoverview MCP servers as chat tools, through LobeChat's MCP client
 * (`apps/qwk-in-lobe/src/libs/mcp/client.ts`).
 *
 * Each enabled MCP server from Settings → MCP Servers becomes one tool
 * provider: its `tools/list` entries are offered to the model as functions
 * named `mcp_<server>_<tool>`, and a call goes to the server's `tools/call`.
 *
 * Streamable-HTTP servers work everywhere. Stdio servers (a local command)
 * need a Node runtime that can spawn processes, so they work in local dev and
 * self-hosted Node, and are skipped on the Cloudflare Worker.
 *
 * Connections are kept per isolate for a few minutes, so a conversation does
 * not reconnect and re-list tools on every message.
 */

import { MCPClient } from "qwk-in-lobe/src/libs/mcp/client";
import type { MCPClientParams, McpTool, ToolCallResult } from "qwk-in-lobe/src/libs/mcp/types";
import { toFunctionName, type LobeToolProvider } from "./lobe-tools";

/** The MCP server types this module serves, as stored in the config (see lib/mcp-servers/lobe-mcp.ts). */
export const LOBE_MCP_SERVER_TYPES = ["lobe-mcp", "lobe-mcp-stdio"];

/** A configured server, as `configManager.getConfig("mcpServers")` returns it. */
export interface ConfiguredMCPServer {
  id: string;
  name: string;
  type: string;
  enabled?: boolean;
  config: Record<string, any>;
}

/** How long a connection (and its tool list) is reused. */
const CONNECTION_TTL_MS = 5 * 60_000;

/** Longest a server may take to connect and list its tools. */
const CONNECT_TIMEOUT_MS = 8_000;

/** Longest tool result text handed back to the model. */
const MAX_RESULT_CHARS = 25_000;

const parseArgs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to whitespace splitting
    }
  }
  return trimmed.split(/\s+/);
};

const parseHeaders = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object") return value as Record<string, string>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

/** Turns a configured server into LobeChat MCP client params, or null if incomplete. */
export const toClientParams = (server: ConfiguredMCPServer): MCPClientParams | null => {
  const config = server.config ?? {};
  if (typeof config.url === "string" && config.url.trim()) {
    return {
      type: "http",
      name: server.name,
      url: config.url.trim(),
      headers: parseHeaders(config.headers),
      ...(config.authToken ? { auth: { type: "bearer", token: String(config.authToken) } } : {}),
    } as MCPClientParams;
  }
  if (typeof config.command === "string" && config.command.trim()) {
    return {
      type: "stdio",
      name: server.name,
      command: config.command.trim(),
      args: parseArgs(config.args),
      env: parseHeaders(config.env),
    };
  }
  return null;
};

/** MCP tool results as text: text parts as-is, other parts summarised. */
export const toolResultToText = (result: ToolCallResult): string => {
  const parts = (result?.content ?? []).map((part: any) => {
    switch (part.type) {
      case "text":
        return part.text;
      case "resource":
        return part.resource?.text ?? `[resource ${part.resource?.uri ?? ""}]`;
      case "resource_link":
        return `[${part.name}](${part.uri})`;
      case "image":
        return `[image ${part.mimeType}]`;
      case "audio":
        return `[audio ${part.mimeType}]`;
      default:
        return "";
    }
  });
  let text = parts.filter(Boolean).join("\n\n");
  if (!text && result?.structuredContent !== undefined) text = JSON.stringify(result.structuredContent);
  return text.slice(0, MAX_RESULT_CHARS);
};

interface Connection {
  client: MCPClient;
  tools: McpTool[];
  connectedAt: number;
}

export type CreateMCPClient = (params: MCPClientParams) => Pick<MCPClient, "initialize" | "listTools" | "callTool" | "disconnect">;

const connections = new Map<string, Promise<Connection>>();

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

const connectionKey = (server: ConfiguredMCPServer) => `${server.id}:${JSON.stringify(server.config)}`;

const connect = (
  server: ConfiguredMCPServer,
  params: MCPClientParams,
  createClient: CreateMCPClient,
): Promise<Connection> => {
  const key = connectionKey(server);
  const cached = connections.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const client = createClient(params) as MCPClient;
    await withTimeout(client.initialize(), CONNECT_TIMEOUT_MS, `MCP server ${server.name} did not connect in time`);
    const tools = await withTimeout(client.listTools(), CONNECT_TIMEOUT_MS, `MCP server ${server.name} did not list its tools in time`);
    return { client, tools, connectedAt: Date.now() };
  })();

  connections.set(key, pending);
  pending.then(
    (connection) => {
      const timer = setTimeout(() => {
        if (connections.get(key) === pending) connections.delete(key);
        connection.client.disconnect().catch(() => {});
      }, CONNECTION_TTL_MS);
      (timer as { unref?: () => void }).unref?.();
    },
    () => connections.delete(key),
  );
  return pending;
};

/** Drops every cached connection (tests, config changes). */
export const resetMCPConnections = () => {
  for (const pending of connections.values()) {
    pending.then((c) => c.client.disconnect().catch(() => {})).catch(() => {});
  }
  connections.clear();
};

export interface LoadMCPProvidersOptions {
  servers: ConfiguredMCPServer[];
  createClient?: CreateMCPClient;
}

/**
 * Connects to every enabled MCP server of the LobeChat type and returns one
 * tool provider per server that answered. A server that fails is logged and
 * left out, so one broken server never breaks the chat.
 */
export async function loadMCPProviders(options: LoadMCPProvidersOptions): Promise<LobeToolProvider[]> {
  const createClient: CreateMCPClient = options.createClient ?? ((params) => new MCPClient(params));
  const servers = options.servers.filter((s) => s.enabled !== false && LOBE_MCP_SERVER_TYPES.includes(s.type));

  const providers = await Promise.all(
    servers.map(async (server): Promise<LobeToolProvider | null> => {
      const params = toClientParams(server);
      if (!params) return null;
      try {
        const connection = await connect(server, params, createClient);
        if (connection.tools.length === 0) return null;
        const slug = toFunctionName(server.name.toLowerCase()).slice(0, 20);
        return {
          identifier: `mcp-${server.id}`,
          name: server.name,
          description: `Tools from the ${server.name} MCP server.`,
          namePrefix: `mcp_${slug}_`,
          apis: connection.tools.map((t) => ({
            name: t.name,
            description: t.description || t.name,
            parameters: (t.inputSchema as Record<string, any>) ?? { type: "object", properties: {} },
          })),
          invoke: async (apiName, args) => {
            try {
              const result = await connection.client.callTool(apiName, args ?? {});
              return { content: toolResultToText(result) || "(no output)", success: !result?.isError };
            } catch (error) {
              connections.delete(connectionKey(server));
              return { content: error instanceof Error ? error.message : String(error), success: false };
            }
          },
          describe: (apiName) => ({ query: `${server.name} · ${apiName}`, category: "tool" }),
        };
      } catch (error) {
        console.warn(`[mcp-tools] skipping MCP server "${server.name}":`, error instanceof Error ? error.message : error);
        return null;
      }
    }),
  );

  return providers.filter((p): p is LobeToolProvider => p !== null);
}
