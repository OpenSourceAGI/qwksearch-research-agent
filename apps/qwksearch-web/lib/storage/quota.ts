/**
 * User storage quota management utilities
 */

import { getDB } from "@/lib/database";
import { user as userTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export interface StorageQuota {
  allowed: boolean;
  used: number;
  quota: number;
  remaining: number;
}

export const DEFAULT_STORAGE_QUOTA_BYTES = 1073741824; // 1GB

export async function checkUserStorageQuota(
  userId: string,
  additionalBytes: number
): Promise<StorageQuota> {
  try {
    const db = getDB();
    const userRecord = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return {
        allowed: additionalBytes <= DEFAULT_STORAGE_QUOTA_BYTES,
        used: 0,
        quota: DEFAULT_STORAGE_QUOTA_BYTES,
        remaining: DEFAULT_STORAGE_QUOTA_BYTES - additionalBytes,
      };
    }

    const user = userRecord[0];
    const used = user.storageUsedBytes || 0;
    const quota = user.storageQuotaBytes || DEFAULT_STORAGE_QUOTA_BYTES;
    const remaining = quota - used;

    return {
      allowed: additionalBytes <= remaining,
      used,
      quota,
      remaining,
    };
  } catch (error) {
    console.error("[checkUserStorageQuota] Error:", error);
    return {
      allowed: false,
      used: 0,
      quota: DEFAULT_STORAGE_QUOTA_BYTES,
      remaining: 0,
    };
  }
}

export async function incrementUserStorageUsage(
  userId: string,
  bytes: number
): Promise<boolean> {
  try {
    const db = getDB();
    await db
      .update(userTable)
      .set({
        storageUsedBytes: (prevValue) => (prevValue || 0) + bytes,
      })
      .where(eq(userTable.id, userId));
    return true;
  } catch (error) {
    console.error("[incrementUserStorageUsage] Error:", error);
    return false;
  }
}

export async function decrementUserStorageUsage(
  userId: string,
  bytes: number
): Promise<boolean> {
  try {
    const db = getDB();
    const userRecord = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return false;
    }

    const currentUsage = userRecord[0].storageUsedBytes || 0;
    const newUsage = Math.max(0, currentUsage - bytes);

    await db
      .update(userTable)
      .set({ storageUsedBytes: newUsage })
      .where(eq(userTable.id, userId));

    return true;
  } catch (error) {
    console.error("[decrementUserStorageUsage] Error:", error);
    return false;
  }
}

export async function getUserStorageStats(
  userId: string
): Promise<StorageQuota> {
  try {
    const db = getDB();
    const userRecord = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return {
        allowed: true,
        used: 0,
        quota: DEFAULT_STORAGE_QUOTA_BYTES,
        remaining: DEFAULT_STORAGE_QUOTA_BYTES,
      };
    }

    const user = userRecord[0];
    const used = user.storageUsedBytes || 0;
    const quota = user.storageQuotaBytes || DEFAULT_STORAGE_QUOTA_BYTES;

    return {
      allowed: used < quota,
      used,
      quota,
      remaining: quota - used,
    };
  } catch (error) {
    console.error("[getUserStorageStats] Error:", error);
    return {
      allowed: false,
      used: 0,
      quota: DEFAULT_STORAGE_QUOTA_BYTES,
      remaining: 0,
    };
  }
}
