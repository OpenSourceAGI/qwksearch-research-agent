/**
 * Per-user NotebookLM credential storage using Cloudflare KV.
 * Stores encrypted Google auth cookies obtained via Puppeteer login automation.
 */

import { getCloudflareContext } from "../cloudflare-context";

const KV_PREFIX = "notebooklm:creds:";

export interface NotebookLMCredentials {
  userId: string;
  googleEmail: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }>;
  authHeaders?: Record<string, string>;
  createdAt: number;
  expiresAt?: number;
}

function getKV(): any {
  const ctx = getCloudflareContext();
  return (ctx.env as any)?.KV;
}

export async function storeCredentials(
  userId: string,
  creds: Omit<NotebookLMCredentials, "userId" | "createdAt">,
): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV binding not available");

  const record: NotebookLMCredentials = {
    ...creds,
    userId,
    createdAt: Date.now(),
  };

  await kv.put(KV_PREFIX + userId, JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getCredentials(
  userId: string,
): Promise<NotebookLMCredentials | null> {
  const kv = getKV();
  if (!kv) throw new Error("KV binding not available");

  const raw = await kv.get(KV_PREFIX + userId);
  if (!raw) return null;

  const creds: NotebookLMCredentials = JSON.parse(raw);

  if (creds.expiresAt && Date.now() > creds.expiresAt) {
    await kv.delete(KV_PREFIX + userId);
    return null;
  }

  return creds;
}

export async function deleteCredentials(userId: string): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV binding not available");
  await kv.delete(KV_PREFIX + userId);
}

export async function hasCredentials(userId: string): Promise<boolean> {
  const creds = await getCredentials(userId);
  return creds !== null;
}
