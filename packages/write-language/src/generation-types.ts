// @ts-nocheck
/**
 * @module research/agents/generate-language-types
 * @description Shared types for the generate-language module.
 */

/** Supported LLM provider identifiers */
export type LLMProviderName =
  | "nvidia"
  | "openrouter"
  | "anthropic"
  | "google"
  | "openai"
  | "xai"
  | "groq"
  | "cloudflare"
  | "perplexity"
  | "amazon"
  | "bedrock"
  | "togetherai"
  | (string & {}); // preserve autocomplete while allowing arbitrary strings

/**
 * A file or image attachment passed to the model alongside the text prompt.
 *
 * The Vercel AI SDK accepts these as multimodal message content parts:
 * images become `{ type: "image", image }` parts and every other media type
 * becomes a `{ type: "file", data, mediaType }` part. `data` may be a base64
 * string, a `data:` URL, an `http(s)` URL, a `URL` instance, or raw bytes.
 */
export interface LanguageAttachment {
  /** MIME type, e.g. `"image/png"`, `"application/pdf"`. */
  mediaType: string;
  /**
   * The attachment payload: a base64 string, a `data:`/`http(s)` URL, a `URL`
   * instance, or raw bytes (`Uint8Array`/`ArrayBuffer`).
   */
  data: string | Uint8Array | ArrayBuffer | URL;
  /** Optional original filename (used by providers that surface it). */
  filename?: string;
  /**
   * Force how the part is sent. Defaults to auto-detection from `mediaType`
   * (`image/*` → image part, otherwise a file part).
   */
  kind?: "image" | "file";
}

/**
 * Configuration options for {@link writeLanguageResponse}.
 */
export interface GenerateLanguageOptions {
  /** LLM provider to use */
  provider: LLMProviderName;
  /**
   * API key for the provider.
   * For `cloudflare`, use the `"apiToken:accountId"` format.
   * For `amazon`/`bedrock`, use bearer token or `"region:accessKeyId:secretAccessKey"` format.
   */
  apiKey?: string;
  /** Agent prompt template name (default: `"question"`) */
  agent?: string;
  /** Specific model ID. Falls back to the provider's registered default. */
  model?: string;
  /**
   * Sampling temperature (0\u20132).
   * Lower = more deterministic; higher = more creative. Default: `1`
   */
  temperature?: number;
  /** User query text */
  query?: string;
  /** Article or document text to process */
  article?: string;
  /** Prior conversation history for context-aware agents */
  chat_history?: string;
  /**
   * File and image attachments to send to the model alongside the prompt.
   * When present, the request is issued as a multimodal `messages` call so the
   * model receives the uploaded files (images and documents) directly.
   */
  attachments?: LanguageAttachment[];
  /** Return `HTML` (`true`) or raw Markdown (`false`). Default: `true` */
  html?: boolean;
  /** Truncate the prompt to the model's context window length. Default: `true` */
  applyContextLimit?: boolean;
  /** Additional template variables forwarded to the agent prompt */
  [key: string]: unknown;
}

/** Return value of {@link writeLanguageResponse} */
export interface GenerateLanguageResult {
  /** Generated response in HTML or Markdown format */
  content?: string;
  /** Structured data extracted by the agent's `after` callback */
  extract?: unknown;
  /** Human-readable error message when generation fails */
  error?: string;
}

/** Agent prompt template definition */
export interface AgentPrompt {
  name: string;
  /** Mustache-style template string with `{variableName}` placeholders */
  template?: string;
  prompt?: string;
  /** Called before template substitution to pre-process the prompt */
  before?: (
    prompt: string | undefined,
    options: GenerateLanguageOptions,
  ) => string;
  /** Called after generation to extract structured data from the raw reply */
  after?: (reply: string, options: GenerateLanguageOptions) => unknown;
  /** Names of registered agent tools to attach to this agent */
  tools?: string[];
}

/** A registered agent tool with a name, schema, and async handler */
export interface AgentTool {
  name: string;
  func: (...args: unknown[]) => unknown | Promise<unknown>;
  [key: string]: unknown;
}
