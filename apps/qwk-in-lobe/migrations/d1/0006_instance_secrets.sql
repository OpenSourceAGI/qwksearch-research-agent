-- Per-deployment secrets the lobe Worker generates for itself when the operator
-- has not set them. Today: KEY_VAULTS_SECRET, used to encrypt provider API keys
-- when LobeHub's data is on D1 and no Worker secret is configured
-- (worker/cf/keyVaultsSecret.ts, which also creates this table on first use).
CREATE TABLE IF NOT EXISTS lobe_instance_secrets (
  name TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
