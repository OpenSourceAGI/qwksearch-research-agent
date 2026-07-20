// Type definitions for Cloudflare Worker environment

declare global {
  namespace CloudflareWorker {
    interface Env {
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
  }
}

export {};
