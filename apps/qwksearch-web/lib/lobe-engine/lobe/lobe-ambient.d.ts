// Type-checking stand-ins for the modules the qwk-in-lobe source this app
// imports refers to (see ./aliases.ts). qwk-in-lobe is a separate pnpm
// workspace whose dependencies are not installed here, so from its files
// these specifiers do not resolve for tsc. Ambient declarations only fill in
// for type-checking: the bundler never reads them, and at runtime the aliases
// and `resolve.dedupe` in vite.config.ts point these imports at real code.

declare module "@lobechat/types" {
  export interface LobeChatPluginApi {
    description: string;
    name: string;
    parameters: Record<string, any>;
    [key: string]: any;
  }

  export interface BuiltinToolManifest {
    api: LobeChatPluginApi[];
    identifier: string;
    meta: { avatar?: string; description?: string; readme?: string; title?: string; [key: string]: any };
    systemRole: string;
    type: "builtin";
    [key: string]: any;
  }

  export interface BuiltinServerRuntimeOutput {
    content: string;
    error?: any;
    state?: any;
    success: boolean;
    [key: string]: any;
  }

  export interface BuiltinToolResult {
    content?: string;
    error?: { message: string; type?: string; [key: string]: any };
    state?: any;
    success: boolean;
    [key: string]: any;
  }

  export interface IBuiltinToolExecutor {
    identifier: string;
    invoke: (apiName: string, params: any, ctx: any) => Promise<BuiltinToolResult>;
    [key: string]: any;
  }

  export abstract class BaseExecutor<TApiEnum extends Record<string, string>> implements IBuiltinToolExecutor {
    abstract readonly identifier: string;
    protected abstract readonly apiEnum: TApiEnum;
    invoke: (apiName: string, params: any, ctx: any) => Promise<BuiltinToolResult>;
    hasApi(apiName: string): boolean;
    getApiNames(): string[];
  }

  export type MCPErrorType = string;

  export interface SearchQuery {
    query: string;
    searchCategories?: string[];
    searchEngines?: string[];
    searchTimeRange?: string;
  }

  export interface SearchContent {
    content?: string;
    imgSrc?: string;
    publishedDate?: string | null;
    thumbnail?: string | null;
    title: string;
    url: string;
  }

  export interface CrawlSinglePageQuery {
    url: string;
  }

  export interface CrawlMultiPagesQuery {
    urls: string[];
  }

  export interface SearchServiceImpl {
    crawlPages: (params: CrawlMultiPagesQuery, options?: { signal?: AbortSignal }) => Promise<{ results: any[] }>;
    webSearch: (params: SearchQuery, options?: { signal?: AbortSignal }) => Promise<any>;
  }

  export interface CrawlSuccessResult {
    content?: string;
    contentType?: "text" | "json";
    description?: string;
    length?: number;
    siteName?: string;
    title?: string;
    url: string;
  }
}

declare module "@lobechat/web-crawler" {
  export interface CrawlSuccessResult {
    content?: string;
    contentType?: "text" | "json";
    description?: string;
    length?: number;
    siteName?: string;
    title?: string;
    url: string;
  }
}

declare module "debug" {
  export default function debug(namespace: string): (formatter: any, ...args: any[]) => void;
}

declare module "@modelcontextprotocol/sdk/client/index.js" {
  export class Client {
    constructor(...args: any[]);
    [key: string]: any;
  }
}
declare module "@modelcontextprotocol/sdk/client/stdio.js" {
  export class StdioClientTransport {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export function getDefaultEnvironment(): Record<string, string>;
}
declare module "@modelcontextprotocol/sdk/client/streamableHttp.js" {
  export class StreamableHTTPClientTransport {
    constructor(...args: any[]);
    [key: string]: any;
  }
}
declare module "@modelcontextprotocol/sdk/shared/transport.js" {
  export type Transport = any;
}
declare module "@modelcontextprotocol/sdk/types.js" {
  export type Progress = any;
}
declare module "@thi.ng/base-n/*";
declare module "nerdamer-prime/*";
declare module "mathjs";
declare module "dayjs";
declare module "lucide-react";
