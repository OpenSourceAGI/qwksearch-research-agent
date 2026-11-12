/**
 * @fileoverview Strips credentials from the site config before it leaves the
 * server.
 *
 * `GET /api/config` is public — the Settings UI of every visitor (and of
 * embeds such as debate-ai.com) reads it — but the config it returns holds the
 * site's own provider keys (`OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, …, loaded
 * as env-based providers) and any key someone saved on a provider or MCP
 * server. None of those may be sent to a browser. The Settings UI never needs
 * the stored value: it shows an empty password field, and a blank field sent
 * back keeps the stored key (`chat-agent-toolkit`'s `updateModelProvider`).
 */

/**
 * Config keys that hold a credential, matched case-insensitively on how the
 * key ends: `apiKey`, `clientSecret`, `accessToken`, `secretAccessKey` — but
 * not `apiKeyUrl`, `tokenUrl` or `maxTokens`.
 */
const SECRET_KEY_PATTERN =
  /(api[-_]?key|secret|token|password|passwd|credentials?|private[-_]?key|access[-_]?key)$/i;

export function isSecretConfigKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/** A copy of `config` with every credential-looking value replaced by `""`. */
export function redactSecretFields<T extends Record<string, unknown> | undefined | null>(config: T): T {
  if (!config || typeof config !== "object") return config;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (isSecretConfigKey(key) && typeof value === "string") out[key] = "";
    else if (value && typeof value === "object" && !Array.isArray(value)) out[key] = redactSecretFields(value as Record<string, unknown>);
    else out[key] = value;
  }
  return out as T;
}

interface WithConfig {
  config?: Record<string, unknown>;
  apiKey?: string;
  [key: string]: unknown;
}

/** Model providers and MCP servers with their credentials blanked. */
export function redactConnections<T extends WithConfig>(entries: T[] | undefined): T[] {
  if (!Array.isArray(entries)) return entries ?? [];
  return entries.map((entry) => {
    const copy: WithConfig = { ...entry, config: redactSecretFields(entry.config) };
    if (typeof copy.apiKey === "string") copy.apiKey = "";
    return copy as T;
  });
}
