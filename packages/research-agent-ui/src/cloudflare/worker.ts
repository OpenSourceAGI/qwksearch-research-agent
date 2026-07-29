/**
 * @fileoverview Cloudflare Worker entry point exposing metadata, OAuth, connection
 * management, run-log, and transit-file endpoints for research-agent-ui.
 *
 * Routes are admin-token authenticated (except metadata/health/OAuth) and
 * backed directly by D1 plus an R2 or KV transit-file store. A scheduled
 * handler periodically purges expired OAuth state, idempotency keys, and
 * transit files.
 */
import { Router, IRequest } from 'itty-router';
import { json, text, error as httpError } from 'itty-router';

// itty-router v5 removed the `missing` helper; provide a 404 shim via `error`.
const missing = (message?: string) => httpError(404, message ?? 'Not Found');

// Cloudflare Workers runtime for research-agent-ui
// Provides metadata endpoints, OAuth flows, connection management, and transit file handling

export interface Env {
  DB: D1Database;
  TRANSIT_FILES: R2Bucket | KVNamespace;
  OOMOL_CONNECT_ADMIN_TOKEN: string;
  OOMOL_CONNECT_ENCRYPTION_KEY: string;
  TRANSIT_FILES_BACKEND: 'r2' | 'kv';
  OOMOL_CONNECT_TRANSIT_FILE_TTL_SECONDS: string;
  OOMOL_CONNECT_TRANSIT_FILE_MAX_BYTES: string;
  OOMOL_CONNECT_MAX_CONCURRENT_EXECUTIONS: string;
  NODE_ENV: 'production' | 'staging' | 'development';
  RESEARCH_AGENT_UI_VERSION: string;
}

const router = Router();

// Health check
router.get('/health', (req: IRequest, env: Env) => {
  return json({ ok: true, version: env.RESEARCH_AGENT_UI_VERSION || '0.1.0' });
});

// Metadata: catalog and capabilities
router.get('/api/v1/metadata', (req: IRequest, env: Env) => {
  return json({
    name: 'research-agent-ui',
    version: env.RESEARCH_AGENT_UI_VERSION || '0.1.0',
    provider: 'cloudflare-workers',
    capabilities: [
      'chat',
      'search',
      'article-reader',
      'file-upload',
      'chat-history',
    ],
    features: {
      transit_files: {
        backend: env.TRANSIT_FILES_BACKEND,
        max_size_bytes: parseInt(env.OOMOL_CONNECT_TRANSIT_FILE_MAX_BYTES || '52428800'),
        ttl_seconds: parseInt(env.OOMOL_CONNECT_TRANSIT_FILE_TTL_SECONDS || '86400'),
      },
      oauth: {
        enabled: true,
        supported_providers: ['google', 'github', 'github-enterprise'],
      },
      rate_limiting: {
        max_concurrent_executions: parseInt(env.OOMOL_CONNECT_MAX_CONCURRENT_EXECUTIONS || '10'),
      },
    },
  });
});

// Admin auth middleware
const authenticateAdmin = (req: IRequest, env: Env): boolean => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === env.OOMOL_CONNECT_ADMIN_TOKEN;
};

// Connections: list, create, delete
router.get('/api/v1/connections', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const { results } = await env.DB.prepare('SELECT * FROM connections').all();
  return json(results);
});

router.post('/api/v1/connections', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const body = await req.json();
  const { user_id, provider, name, config } = body;

  if (!user_id || !provider || !name) {
    return httpError(400, 'Missing required fields: user_id, provider, name');
  }

  const id = crypto.randomUUID();
  const stmt = env.DB.prepare(`
    INSERT INTO connections (id, user_id, provider, name, config)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    await stmt.bind(id, user_id, provider, name, JSON.stringify(config || {})).run();
    return json({ id, user_id, provider, name }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return httpError(409, 'Connection already exists for this user, provider, and name');
    }
    return httpError(500, 'Failed to create connection');
  }
});

router.delete('/api/v1/connections/:id', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const { id } = req.params;
  await env.DB.prepare('DELETE FROM connections WHERE id = ?').bind(id).run();
  return json({ ok: true });
});

// OAuth: initiate flow, callback handler
router.post('/api/v1/oauth/authorize', async (req: IRequest, env: Env) => {
  const body = await req.json();
  const { provider, redirect_url, request_data } = body;

  if (!provider || !redirect_url) {
    return httpError(400, 'Missing required fields: provider, redirect_url');
  }

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  await env.DB.prepare(`
    INSERT INTO oauth_state (state, provider, redirect_url, request_data, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(state, provider, redirect_url, JSON.stringify(request_data || {}), expiresAt).run();

  return json({ state, expires_in: 900 });
});

router.post('/api/v1/oauth/callback', async (req: IRequest, env: Env) => {
  const body = await req.json();
  const { state, code, error: oauthError } = body;

  if (oauthError) {
    return httpError(400, `OAuth error: ${oauthError}`);
  }

  if (!state || !code) {
    return httpError(400, 'Missing required fields: state, code');
  }

  const { results } = await env.DB.prepare('SELECT * FROM oauth_state WHERE state = ?').bind(state).all();

  if (!results || results.length === 0) {
    return httpError(400, 'Invalid or expired state');
  }

  const oauthRecord = results[0];
  await env.DB.prepare('DELETE FROM oauth_state WHERE state = ?').bind(state).run();

  return json({ ok: true, provider: oauthRecord.provider });
});

// Run logs: audit trail
router.get('/api/v1/run-logs', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const limit = Math.min(parseInt(req.query.limit || '100'), 1000);
  const { results } = await env.DB.prepare('SELECT * FROM run_logs ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all();

  return json(results);
});

router.post('/api/v1/run-logs', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const body = await req.json();
  const { connection_id, action, input, status } = body;

  if (!connection_id || !action || !input) {
    return httpError(400, 'Missing required fields: connection_id, action, input');
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO run_logs (id, connection_id, action, input, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, connection_id, action, JSON.stringify(input), status || 'pending').run();

  return json({ id }, { status: 201 });
});

// Transit files: upload, download, cleanup
router.post('/api/v1/transit-files', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const connection_id = formData.get('connection_id') as string;

  if (!file || !connection_id) {
    return httpError(400, 'Missing required fields: file, connection_id');
  }

  const maxBytes = parseInt(env.OOMOL_CONNECT_TRANSIT_FILE_MAX_BYTES || '52428800');
  if (file.size > maxBytes) {
    return httpError(413, `File exceeds max size of ${maxBytes} bytes`);
  }

  const fileId = crypto.randomUUID();
  const backendKey = `${connection_id}/${fileId}/${file.name}`;
  const ttlSeconds = parseInt(env.OOMOL_CONNECT_TRANSIT_FILE_TTL_SECONDS || '86400');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  // Store file in backend
  if (env.TRANSIT_FILES_BACKEND === 'r2') {
    const bucket = env.TRANSIT_FILES as R2Bucket;
    await bucket.put(backendKey, file);
  } else {
    const kv = env.TRANSIT_FILES as KVNamespace;
    const buffer = await file.arrayBuffer();
    await kv.put(backendKey, buffer, { expirationTtl: ttlSeconds });
  }

  // Record metadata
  await env.DB.prepare(`
    INSERT INTO transit_files (id, connection_id, name, mime_type, size_bytes, backend, backend_key, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(fileId, connection_id, file.name, file.type, file.size, env.TRANSIT_FILES_BACKEND, backendKey, expiresAt).run();

  return json({ id: fileId, name: file.name, size: file.size, expires_at: expiresAt }, { status: 201 });
});

router.get('/api/v1/transit-files/:id', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const { id } = req.params;
  const { results } = await env.DB.prepare('SELECT * FROM transit_files WHERE id = ?').bind(id).all();

  if (!results || results.length === 0) {
    return missing('File not found');
  }

  const fileRecord = results[0];

  // Retrieve file from backend
  if (env.TRANSIT_FILES_BACKEND === 'r2') {
    const bucket = env.TRANSIT_FILES as R2Bucket;
    const obj = await bucket.get(fileRecord.backend_key);
    if (!obj) return missing('File not found in R2');
    return new Response(obj.body, { headers: { 'Content-Type': fileRecord.mime_type } });
  } else {
    const kv = env.TRANSIT_FILES as KVNamespace;
    const data = await kv.get(fileRecord.backend_key, 'arrayBuffer');
    if (!data) return missing('File not found in KV');
    return new Response(data, { headers: { 'Content-Type': fileRecord.mime_type } });
  }
});

router.delete('/api/v1/transit-files/:id', async (req: IRequest, env: Env) => {
  if (!authenticateAdmin(req, env)) return httpError(401, 'Unauthorized');

  const { id } = req.params;
  const { results } = await env.DB.prepare('SELECT * FROM transit_files WHERE id = ?').bind(id).all();

  if (!results || results.length === 0) {
    return missing('File not found');
  }

  const fileRecord = results[0];

  // Delete from backend
  if (env.TRANSIT_FILES_BACKEND === 'r2') {
    const bucket = env.TRANSIT_FILES as R2Bucket;
    await bucket.delete(fileRecord.backend_key);
  } else {
    const kv = env.TRANSIT_FILES as KVNamespace;
    await kv.delete(fileRecord.backend_key);
  }

  // Remove metadata
  await env.DB.prepare('DELETE FROM transit_files WHERE id = ?').bind(id).run();

  return json({ ok: true });
});

// Catch-all 404
router.all('*', () => missing('Not Found'));

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(req, env, ctx) as Promise<Response>;
  },

  // Scheduled handler for cleanup tasks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredRecords(env));
  },
};

async function cleanupExpiredRecords(env: Env) {
  const now = new Date().toISOString();

  // Clean up expired OAuth state records
  await env.DB.prepare('DELETE FROM oauth_state WHERE expires_at < ?').bind(now).run();

  // Clean up expired idempotency keys
  await env.DB.prepare('DELETE FROM idempotency_keys WHERE expires_at < ?').bind(now).run();

  // Clean up expired transit files from DB and storage
  const { results: expiredFiles } = await env.DB.prepare(
    'SELECT * FROM transit_files WHERE expires_at < ?'
  ).bind(now).all();

  if (expiredFiles) {
    for (const file of expiredFiles) {
      try {
        if (env.TRANSIT_FILES_BACKEND === 'r2') {
          const bucket = env.TRANSIT_FILES as R2Bucket;
          await bucket.delete(file.backend_key);
        } else {
          const kv = env.TRANSIT_FILES as KVNamespace;
          await kv.delete(file.backend_key);
        }
      } catch (e) {
        console.error(`Failed to delete file ${file.id}:`, e);
      }
    }
  }

  await env.DB.prepare('DELETE FROM transit_files WHERE expires_at < ?').bind(now).run();
}
