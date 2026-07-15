/**
 * User storage quota management utilities.
 *
 * Usage is computed from the `uploads` D1 table (the source of truth kept
 * by /api/doc/uploads); the per-user quota comes from the
 * `user.storage_quota_bytes` column with a 1 GB default. The
 * `user.storage_used_bytes` counter is maintained best-effort for
 * informational purposes only and is never used for enforcement.
 */

import { getDB } from "@/lib/database";
import { user as userTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import {
  getUserUsageBytes,
  getUserQuotaBytes,
  USER_QUOTA_BYTES,
} from "@/lib/uploads";

export interface StorageQuota {
  allowed: boolean;
  used: number;
  quota: number;
  remaining: number;
}

export const DEFAULT_STORAGE_QUOTA_BYTES = USER_QUOTA_BYTES; // 1GB

export async function checkUserStorageQuota(
  userId: string,
  additionalBytes: number
): Promise<StorageQuota> {
  try {
    const db = getDB();
    const used = await getUserUsageBytes(db, userId);
    const quota = await getUserQuotaBytes(db, userId);
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
    const userRecord = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { storageUsedBytes: true },
    });
    if (!userRecord) return false;

    await db
      .update(userTable)
      .set({ storageUsedBytes: (userRecord.storageUsedBytes || 0) + bytes })
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
    const userRecord = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { storageUsedBytes: true },
    });
    if (!userRecord) return false;

    const newUsage = Math.max(0, (userRecord.storageUsedBytes || 0) - bytes);

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
    const used = await getUserUsageBytes(db, userId);
    const quota = await getUserQuotaBytes(db, userId);

    return {
      allowed: used < quota,
      used,
      quota,
      remaining: Math.max(0, quota - used),
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
