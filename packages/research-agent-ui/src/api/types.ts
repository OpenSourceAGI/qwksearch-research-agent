/**
 * @fileoverview Dependency injection types for research-agent-ui API route handlers.
 *
 * Each factory function accepts a narrow `deps` object containing only the
 * app-specific implementations it needs (db, auth helpers, env accessor, etc.)
 * so the same handler logic can run in any Next.js app.
 */

export type DrizzleDB = any;

export interface AuthDeps {
  getUserId: () => Promise<string | null>;
  requireUserId: () => Promise<string>;
}

export interface SessionDeps {
  getSession: () => Promise<any>;
}

export interface EnvDeps {
  getEnv: (key: string) => string | undefined | null;
}

export interface ArticleDeps extends AuthDeps, EnvDeps {
  getDB: () => DrizzleDB;
  userSchema: any;
}

export interface ChatsDeps {
  getDB: () => DrizzleDB;
  requireUserId: () => Promise<string>;
  getUserId?: () => Promise<string | null>;
  schema: {
    chats: any;
    messages: any;
  };
}

export interface MessagesDeps {
  getDB: () => DrizzleDB;
  requireUserId: () => Promise<string>;
  messagesSchema: any;
}

export interface ProvidersDeps extends SessionDeps {}

export interface MCPServersDeps {
  configManager: {
    addMCPServer(type: string, name: string, config: any): any;
    removeMCPServer(id: string): void;
    updateMCPServer(id: string, name: string, config: any): Promise<any>;
    toggleMCPServer(id: string, enabled: boolean): any;
  };
  getConfiguredMCPServers: () => any[];
}

export interface SearchDeps {
  searxngDomain?: string;
}

export interface VoiceDeps extends AuthDeps {
  checkTTSRateLimit: (key: string) => { allowed: boolean };
  generateSpeech: (opts: {
    text: string;
    provider: string;
    voice: string;
  }) => Promise<{ audio: ArrayBuffer | Uint8Array | Buffer<ArrayBuffer>; contentType: string }>;
}

export interface TranscriptDeps {
  getCloudflareContext: () => { env: any };
}

export interface RewriteDeps extends EnvDeps {
  generateText: (opts: any) => Promise<{ text: string }>;
  /**
   * Streaming counterpart of `generateText`, used only when the request asks
   * for `stream: true`. Optional so a host that has not wired it keeps serving
   * the JSON contract rather than failing the request.
   */
  streamText?: (opts: any) => { textStream: AsyncIterable<string> };
  createGroq: (opts: { apiKey: string }) => (modelId: string) => any;
  /**
   * Loads a model the way the article/page handlers do — from the host's own
   * provider registry, using whichever key that deployment or the signed-in
   * user configured. Optional, and tried either side of the Groq key: first
   * when the caller names a `chatModel`, last when `GROQ_API_KEY` is unset.
   *
   * Without it a deployment that never set `GROQ_API_KEY` answers every
   * rewrite with a 500, even while its chat routes hold a working model.
   */
  loadChatModel?: (chatModel?: RewriteChatModel) => Promise<unknown>;
}

/** The provider/model pair a caller may name, as the settings UI stores it. */
export interface RewriteChatModel {
  providerId?: string;
  key?: string;
}

export interface ValidateOpenRouterDeps {
  validateOpenRouterModels: (concurrency?: number, timeout?: number) => Promise<any>;
}

export interface AgentsDeps extends AuthDeps, EnvDeps {
  getDB: () => DrizzleDB;
  userSchema: any;
}

export interface ChatHandlerDeps {
  handleChatRequest: (req: Request) => Promise<Response>;
}
