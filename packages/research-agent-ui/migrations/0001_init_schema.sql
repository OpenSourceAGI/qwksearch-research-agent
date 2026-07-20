-- Initialize D1 schema for research-agent-ui on Cloudflare Workers

-- Connections: OAuth providers, API keys, and other integrations
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT,  -- JSON: encrypted OAuth client ID, secret, tokens
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  UNIQUE(user_id, provider, name)
);

CREATE INDEX idx_connections_user ON connections(user_id);
CREATE INDEX idx_connections_provider ON connections(provider);

-- OAuth state: temporary state during OAuth flows
CREATE TABLE IF NOT EXISTS oauth_state (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  request_data TEXT,  -- JSON: flow metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_oauth_state_expires ON oauth_state(expires_at);

-- Run logs: execution history for audit, debugging, and replay
CREATE TABLE IF NOT EXISTS run_logs (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT NOT NULL,  -- JSON
  output TEXT,  -- JSON: encrypted if sensitive
  status TEXT NOT NULL,  -- pending, running, completed, failed
  error_message TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(connection_id) REFERENCES connections(id)
);

CREATE INDEX idx_run_logs_connection ON run_logs(connection_id);
CREATE INDEX idx_run_logs_status ON run_logs(status);
CREATE INDEX idx_run_logs_created ON run_logs(created_at);

-- Action idempotency: deduplication for retried requests
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_body TEXT,  -- JSON
  response_body TEXT,  -- JSON
  status_code INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_idempotency_keys_user ON idempotency_keys(user_id);
CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Transit files: metadata for temporary uploaded/generated files
CREATE TABLE IF NOT EXISTS transit_files (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  backend TEXT NOT NULL,  -- "r2" or "kv"
  backend_key TEXT NOT NULL,  -- R2 object key or KV key
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY(connection_id) REFERENCES connections(id)
);

CREATE INDEX idx_transit_files_connection ON transit_files(connection_id);
CREATE INDEX idx_transit_files_expires ON transit_files(expires_at);

-- Runtime tokens: API tokens for internal use by the Worker
CREATE TABLE IF NOT EXISTS runtime_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  purpose TEXT,  -- "admin", "api", "webhook"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY(id) REFERENCES connections(id)
);

CREATE INDEX idx_runtime_tokens_purpose ON runtime_tokens(purpose);
