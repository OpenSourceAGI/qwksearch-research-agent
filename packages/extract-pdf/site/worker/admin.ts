/**
 * @file admin.ts
 * @description The admin panel's API: a password login and the site-wide
 * ("global") keys it manages.
 *
 * Routes (all under `/api/admin`, none of them CORS-enabled):
 *   POST   /api/admin/login      JSON `{ password }` → sets the session cookie
 *   POST   /api/admin/logout     clears it
 *   GET    /api/admin/settings   the settings, secrets masked (needs the cookie)
 *   PUT    /api/admin/settings   JSON `{ NAME: value | null }`: set or clear (needs the cookie)
 *
 * The password is the `ADMIN_PASSWORD` secret (`wrangler secret put
 * ADMIN_PASSWORD`). Until it is set, every admin route answers 503. Settings
 * live in the `SETTINGS` KV namespace and are layered over the Worker's own
 * vars and secrets by `withStoredSettings`, so a value saved here wins over the
 * one in the dashboard. Under `vinext dev` there is no KV, so settings are
 * kept in memory and reset on restart.
 *
 * Session: an HttpOnly, SameSite=Strict cookie holding an expiry and an
 * HMAC-SHA-256 of it keyed by the password, so changing the password signs
 * every session out. Failed logins are counted per IP in KV.
 */

/** The slice of a Workers KV namespace this file uses. */
export interface SettingsStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AdminEnv {
  /** Password for /admin. Unset: the admin panel is disabled. */
  ADMIN_PASSWORD?: string;
  /** KV namespace the global keys are saved in. Unset: kept in memory (dev). */
  SETTINGS?: SettingsStore;
}

/** The settings the admin panel manages. Secrets are shown masked and never returned. */
export const SETTINGS = [
  { name: 'OPENROUTER_API_KEY', label: 'OpenRouter API key', secret: true, hint: 'Used by the Citation tab when a visitor brings no key of their own.' },
  { name: 'CITE_MODEL', label: 'Default citation model', secret: false, hint: 'e.g. openrouter/free. Empty: extract-cite’s own default.' },
  { name: 'DOCLING_PROCESSOR_URL', label: 'Docling processor URL', secret: false, hint: 'e.g. https://USER-extract-pdf-docling.hf.space. Empty: no OCR follow-up.' },
  { name: 'DOCLING_API_TOKEN', label: 'Docling API token', secret: true, hint: 'Same value as the Space’s DOCLING_API_TOKEN secret.' },
  { name: 'HF_SPACE_TOKEN', label: 'Hugging Face token', secret: true, hint: 'Private Space only: a read token.' },
] as const;

export type SettingName = (typeof SETTINGS)[number]['name'];

/** One setting as /api/admin/settings reports it. */
export interface SettingState {
  name: SettingName;
  label: string;
  secret: boolean;
  hint: string;
  /** Saved in the admin panel. */
  set: boolean;
  /** Set in the panel or in the Worker's own vars/secrets. */
  effective: boolean;
  /** Non-secrets only: the saved value. Secrets show a tail such as `…a1b2`. */
  value: string;
}

export interface AdminSettingsResponse {
  settings: SettingState[];
}

const KV_PREFIX = 'setting:';
const SESSION_COOKIE = 'epd_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_FAILURES = 8;
const FAILURE_WINDOW_SECONDS = 15 * 60;
const MAX_VALUE_LENGTH = 2000;

const memory = new Map<string, string>();

const memoryStore: SettingsStore = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async put(key, value) {
    memory.set(key, value);
  },
  async delete(key) {
    memory.delete(key);
  },
};

const store = (env: AdminEnv): SettingsStore => env.SETTINGS ?? memoryStore;

/**
 * `env` with the saved global keys laid over it, for the demo routes to read
 * as if they were the Worker's own vars. Never throws: a KV outage falls back
 * to the plain env.
 */
export async function withStoredSettings<E extends AdminEnv>(env: E): Promise<E> {
  try {
    const kv = store(env);
    const entries = await Promise.all(SETTINGS.map(async ({ name }) => [name, await kv.get(KV_PREFIX + name)] as const));
    const saved = Object.fromEntries(entries.filter(([, value]) => value)) as Partial<Record<SettingName, string>>;
    return Object.keys(saved).length ? { ...env, ...saved } : env;
  } catch {
    return env;
  }
}

/** Answers `/api/admin/*`. */
export async function handleAdmin(request: Request, url: URL, env: AdminEnv): Promise<Response> {
  try {
    return await route(request, url, env);
  } catch (err) {
    const error = err as Error & { status?: number };
    return reply({ error: error.message || String(err) }, error.status || 500);
  }
}

async function route(request: Request, url: URL, env: AdminEnv): Promise<Response> {
  if (!env.ADMIN_PASSWORD) {
    return reply({ error: 'The admin panel is disabled: set the ADMIN_PASSWORD secret (bunx wrangler secret put ADMIN_PASSWORD).' }, 503);
  }
  const origin = request.headers.get('Origin');
  if (request.method !== 'GET' && origin && origin !== url.origin) return reply({ error: 'Cross-origin request refused.' }, 403);

  switch (url.pathname) {
    case '/api/admin/login': {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      return login(request, url, env);
    }
    case '/api/admin/logout': {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      return reply({ ok: true }, 200, clearCookie(url));
    }
    case '/api/admin/settings': {
      if (request.method !== 'GET' && request.method !== 'PUT') return reply({ error: 'Method not allowed' }, 405);
      if (!(await isSignedIn(request, env))) return reply({ error: 'Not signed in.' }, 401);
      if (request.method === 'PUT') await saveSettings(request, env);
      return reply(await readSettings(env));
    }
    default:
      return reply({ error: 'Not found' }, 404);
  }
}

async function login(request: Request, url: URL, env: AdminEnv): Promise<Response> {
  const kv = store(env);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const counterKey = `login-failures:${ip}`;
  const failures = Number((await kv.get(counterKey).catch(() => null)) || 0);
  if (failures >= MAX_FAILURES) return reply({ error: 'Too many failed attempts. Try again in 15 minutes.' }, 429);

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return reply({ error: 'Send JSON: `{ "password": "…" }`.' }, 400);
  }

  if (!(await sameSecret(password, env.ADMIN_PASSWORD!))) {
    await kv.put(counterKey, String(failures + 1), { expirationTtl: FAILURE_WINDOW_SECONDS }).catch(() => undefined);
    return reply({ error: 'Wrong password.' }, 401);
  }
  await kv.delete(counterKey).catch(() => undefined);
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expires}.${await sign(String(expires), env.ADMIN_PASSWORD!)}`;
  return reply({ ok: true }, 200, `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Strict${secure(url)}`);
}

async function isSignedIn(request: Request, env: AdminEnv): Promise<boolean> {
  const cookie = request.headers.get('Cookie') || '';
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  const [expires, mac] = token.split('.');
  if (!expires || !mac || Number(expires) < Date.now() / 1000) return false;
  return sameSecret(mac, await sign(expires, env.ADMIN_PASSWORD!));
}

async function readSettings(env: AdminEnv): Promise<AdminSettingsResponse> {
  const kv = store(env);
  const bag = env as unknown as Record<string, string | undefined>;
  const settings = await Promise.all(
    SETTINGS.map(async (def): Promise<SettingState> => {
      const saved = (await kv.get(KV_PREFIX + def.name)) || '';
      return {
        ...def,
        set: Boolean(saved),
        effective: Boolean(saved || bag[def.name]),
        value: def.secret ? (saved ? `…${saved.slice(-4)}` : '') : saved,
      };
    }),
  );
  return { settings };
}

async function saveSettings(request: Request, env: AdminEnv): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    throw httpError(400, 'Send JSON: `{ "NAME": "value" }`; `null` or "" clears a setting.');
  }
  const kv = store(env);
  const known = new Set<string>(SETTINGS.map((def) => def.name));
  for (const [name, value] of Object.entries(body)) {
    if (!known.has(name)) throw httpError(400, `Unknown setting ${name}.`);
    if (value !== null && typeof value !== 'string') throw httpError(400, `${name} must be a string or null.`);
    const text = (value ?? '').trim();
    if (text.length > MAX_VALUE_LENGTH) throw httpError(400, `${name} is too long.`);
    if (text) await kv.put(KV_PREFIX + name, text);
    else await kv.delete(KV_PREFIX + name);
  }
}

const encoder = new TextEncoder();

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
  return Array.from(mac, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Constant-time equality: compares SHA-256 digests so length is not leaked either. */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([a, b].map(async (text) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))));
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

const secure = (url: URL) => (url.protocol === 'https:' ? '; Secure' : '');
const clearCookie = (url: URL) => `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure(url)}`;

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function reply(body: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
