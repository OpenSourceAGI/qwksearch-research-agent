declare global {
  interface CloudflareEnv {
    DB: D1Database;
    /** R2 bucket binding for user file uploads (see wrangler.jsonc). */
    R2?: R2BucketLike;
    /** @deprecated older name for the uploads bucket binding */
    UPLOADS?: R2BucketLike;
  }
}

// Minimal R2 bucket type so upload storage compiles without @cloudflare/workers-types
interface R2BucketLike {
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | Blob | ReadableStream,
  ): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  delete(keys: string | string[]): Promise<void>;
}

// Minimal D1Database type so drizzle-orm/d1 binding compiles without @cloudflare/workers-types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: Record<string, unknown>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}
