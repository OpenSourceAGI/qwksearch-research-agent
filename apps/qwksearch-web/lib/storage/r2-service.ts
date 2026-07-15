/**
 * R2 storage service wrapper for Cloudflare Workers R2 binding
 */

import { getCloudflareContext } from "@/lib/cloudflare-context";

export async function uploadToR2(key: string, body: Buffer | string): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    if (!env.R2) {
      throw new Error("R2 binding not available");
    }
    await env.R2.put(key, body);
  } catch (error) {
    console.error(`[uploadToR2] Failed to upload ${key}:`, error);
    throw error;
  }
}

export async function downloadFromR2(key: string): Promise<string> {
  try {
    const { env } = getCloudflareContext();
    if (!env.R2) {
      throw new Error("R2 binding not available");
    }
    const obj = await env.R2.get(key);
    if (!obj) {
      throw new Error(`File not found: ${key}`);
    }
    return await obj.text();
  } catch (error) {
    console.error(`[downloadFromR2] Failed to download ${key}:`, error);
    throw error;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    if (!env.R2) {
      throw new Error("R2 binding not available");
    }
    await env.R2.delete(key);
  } catch (error) {
    console.error(`[deleteFromR2] Failed to delete ${key}:`, error);
    throw error;
  }
}

export async function getR2Metadata(key: string): Promise<{ size: number } | null> {
  try {
    const { env } = getCloudflareContext();
    if (!env.R2) {
      throw new Error("R2 binding not available");
    }
    const obj = await env.R2.head(key);
    if (!obj) {
      return null;
    }
    return { size: obj.size };
  } catch (error) {
    console.error(`[getR2Metadata] Failed to get metadata for ${key}:`, error);
    return null;
  }
}
