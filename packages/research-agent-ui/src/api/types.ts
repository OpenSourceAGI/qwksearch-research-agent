/**
 * Dependency injection types for research-agent-ui API route handlers.
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
  createGroq: (opts: { apiKey: string }) => (modelId: string) => any;
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
