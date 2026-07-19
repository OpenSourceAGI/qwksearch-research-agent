/**
 * @fileoverview Centralized upload management for user-attached documents.
 *
 * Provides three groups of helpers used by the `/api/doc/uploads` endpoint,
 * the settings UI, and the chat search pipeline:
 *
 * - **R2 storage access** — reads/writes/deletes objects in the uploads
 *   bucket using the native Workers `R2` binding when available, falling
 *   back to the S3-compatible API (via `manage-storage`) when running
 *   outside the Workers runtime with `R2_*` credentials configured.
 * - **Text extraction** — converts uploaded PDF, DOCX, TXT, MD, and HTML
 *   files into plain text/HTML suitable for LLM context.
 * - **Quota accounting** — tracks per-user upload records in the D1
 *   `uploads` table and enforces the per-user storage quota.
 *
 * Object key layout in the bucket:
 * - `<fileId>.<ext>` — the original uploaded file
 * - `<fileId>-extracted.json` — `{ title, content, url? }` extracted text
 */

import { getCloudflareContext } from "@/lib/cloudflare-context";
import { getDB } from "@/lib/database";
import { uploads as uploadsTable, type Upload } from "@/lib/database/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

/** Maximum size of a single uploaded file (50 MB). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum number of files accepted in a single upload request. */
export const MAX_FILES_PER_REQUEST = 10;

/** Per-user storage quota across all uploads (1 GB). */
export const USER_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

/** File extensions accepted for upload and text extraction. */
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "html",
  "htm",
] as const;

/** Extension recorded for context files created from an extracted URL. */
export const URL_UPLOAD_EXTENSION = "url";

/** R2 object key of the original uploaded file. */
export const originalObjectKey = (fileId: string, fileExtension: string) =>
  `${fileId}.${fileExtension}`;

/** R2 object key of the extracted `{ title, content }` JSON for a file. */
export const extractedObjectKey = (fileId: string) =>
  `${fileId}-extracted.json`;

/** Extracted text payload stored alongside each upload. */
export interface ExtractedUpload {
  title: string;
  content: string;
  /** Set when the upload was created by extracting a typed-in URL. */
  url?: string;
}

/** Per-user storage usage snapshot. */
export interface UploadQuota {
  /** Whether the additional bytes being checked still fit in the quota. */
  allowed: boolean;
  used: number;
  quota: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// R2 storage access
// ---------------------------------------------------------------------------

function getR2Binding(): any | null {
  try {
    const { env } = getCloudflareContext();
    if (env.R2 && typeof env.R2.put === "function") {
      return env.R2;
    }
  } catch {
    // Workers runtime unavailable (local dev) — fall through to S3 API.
  }
  return null;
}

function getS3Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) return null;
  return {
    provider: "cloudflare" as const,
    BUCKET_NAME: process.env.R2_UPLOADS_BUCKET || "qwksearch-uploads",
    ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
    SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
    BUCKET_URL: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

/**
 * Writes an object to the uploads bucket via the native R2 binding, or the
 * S3-compatible API when the binding is unavailable.
 */
export async function putUploadObject(
  key: string,
  body: Buffer | string,
): Promise<void> {
  const r2 = getR2Binding();
  if (r2) {
    await r2.put(key, body);
    return;
  }

  const s3 = getS3Config();
  if (!s3) {
    throw new Error(
      "R2 storage unavailable: no R2 binding and no R2_ACCOUNT_ID credentials",
    );
  }
  const { manageStorage } = await import("manage-storage");
  await manageStorage("upload", { ...s3, key, body });
}

/**
 * Reads an object from the uploads bucket as text.
 * Returns `null` when the object does not exist.
 */
export async function getUploadObjectText(key: string): Promise<string | null> {
  const r2 = getR2Binding();
  if (r2) {
    const obj = await r2.get(key);
    if (!obj) return null;
    return await obj.text();
  }

  const s3 = getS3Config();
  if (!s3) {
    throw new Error(
      "R2 storage unavailable: no R2 binding and no R2_ACCOUNT_ID credentials",
    );
  }
  try {
    const { manageStorage } = await import("manage-storage");
    return await manageStorage("download", { ...s3, key });
  } catch {
    return null;
  }
}

/**
 * Deletes an object from the uploads bucket. Missing objects are ignored.
 */
export async function deleteUploadObject(key: string): Promise<void> {
  const r2 = getR2Binding();
  if (r2) {
    await r2.delete(key);
    return;
  }

  const s3 = getS3Config();
  if (!s3) {
    throw new Error(
      "R2 storage unavailable: no R2 binding and no R2_ACCOUNT_ID credentials",
    );
  }
  try {
    const { manageStorage } = await import("manage-storage");
    await manageStorage("delete", { ...s3, key });
  } catch {
    // Object already gone — deletion is idempotent.
  }
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/**
 * Extracts text/HTML content from an uploaded file buffer based on its
 * extension. Returns an empty string when extraction fails so uploads can
 * still be stored and listed.
 */
export async function extractUploadText(
  buffer: Buffer,
  fileName: string,
  fileExtension: string,
): Promise<string> {
  try {
    if (fileExtension === "pdf") {
      const { convertPDFToHTML } = await import("extract-pdf");
      const pdfResult = await convertPDFToHTML(buffer, { addCitation: true });
      if (!pdfResult.error) {
        return pdfResult.html || "";
      }
      return "";
    }

    if (fileExtension === "docx") {
      const { convertDOCXToHTML } = await import("extract-webpage");
      return (await convertDOCXToHTML(buffer)) || "";
    }

    if (fileExtension === "html" || fileExtension === "htm") {
      const { extractContent } = await import("extract-webpage");
      const html = buffer.toString("utf-8");
      const article = await extractContent(html, { url: "" });
      if (article && !article.error && article.html) {
        return article.html;
      }
      return html;
    }

    // txt, md — already plain text.
    return buffer.toString("utf-8");
  } catch (error) {
    console.error(
      `[extractUploadText] Extraction failed for ${fileName}:`,
      error,
    );
    return "";
  }
}

// ---------------------------------------------------------------------------
// Quota accounting (D1 `uploads` table)
// ---------------------------------------------------------------------------

/** Lists a user's uploads, most recent first. */
export async function getUserUploads(userId: string): Promise<Upload[]> {
  const db = getDB();
  return await db
    .select()
    .from(uploadsTable)
    .where(eq(uploadsTable.userId, userId))
    .orderBy(desc(uploadsTable.createdAt));
}

/** Returns the user's current storage usage against the quota. */
export async function getUserUploadQuota(
  userId: string,
  additionalBytes = 0,
): Promise<UploadQuota> {
  try {
    const rows = await getUserUploads(userId);
    const used = rows.reduce((sum, row) => sum + (row.size || 0), 0);
    const remaining = Math.max(0, USER_STORAGE_QUOTA_BYTES - used);
    return {
      allowed: additionalBytes <= remaining,
      used,
      quota: USER_STORAGE_QUOTA_BYTES,
      remaining,
    };
  } catch (error) {
    console.error("[getUserUploadQuota] Error:", error);
    return {
      allowed: false,
      used: 0,
      quota: USER_STORAGE_QUOTA_BYTES,
      remaining: 0,
    };
  }
}

/** Inserts an upload record for quota accounting and chat history metadata. */
export async function recordUpload(record: {
  fileId: string;
  userId: string;
  fileName: string;
  fileExtension: string;
  size: number;
}): Promise<void> {
  const db = getDB();
  await db.insert(uploadsTable).values({
    ...record,
    createdAt: new Date(),
  });
}

/**
 * Deletes upload records owned by `userId` and returns the deleted rows so
 * callers can clean up the corresponding R2 objects. Pass `fileIds` to
 * delete a subset, or omit it to delete all of the user's records.
 */
export async function deleteUploadRecords(
  userId: string,
  fileIds?: string[],
): Promise<Upload[]> {
  const db = getDB();
  const where =
    fileIds && fileIds.length > 0
      ? and(eq(uploadsTable.userId, userId), inArray(uploadsTable.fileId, fileIds))
      : eq(uploadsTable.userId, userId);

  const rows = await db.select().from(uploadsTable).where(where);
  if (rows.length > 0) {
    await db.delete(uploadsTable).where(where);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// High-level operations
// ---------------------------------------------------------------------------

/**
 * Stores an upload: writes the original file (when provided) and the
 * extracted JSON to R2, and records the upload in D1 for authenticated
 * users.
 */
export async function storeUpload(options: {
  fileId: string;
  fileName: string;
  fileExtension: string;
  size: number;
  userId: string | null;
  originalBuffer?: Buffer;
  extracted: ExtractedUpload;
}): Promise<void> {
  const { fileId, fileName, fileExtension, size, userId, originalBuffer, extracted } =
    options;

  if (originalBuffer) {
    await putUploadObject(originalObjectKey(fileId, fileExtension), originalBuffer);
  }
  await putUploadObject(extractedObjectKey(fileId), JSON.stringify(extracted));

  if (userId) {
    try {
      await recordUpload({ fileId, userId, fileName, fileExtension, size });
    } catch (error) {
      // Quota accounting is best-effort for resilience; the file itself is
      // already stored and usable.
      console.error(`[storeUpload] Failed to record upload ${fileId}:`, error);
    }
  }
}

/**
 * Fetches the extracted `{ title, content }` JSON for an uploaded file.
 * Returns `null` when the file does not exist or the payload is invalid.
 */
export async function getExtractedUpload(
  fileId: string,
): Promise<ExtractedUpload | null> {
  try {
    const raw = await getUploadObjectText(extractedObjectKey(fileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title || "Uploaded Document",
      content: parsed.content || "",
      ...(parsed.url ? { url: parsed.url } : {}),
    };
  } catch (error) {
    console.error(`[getExtractedUpload] Failed for ${fileId}:`, error);
    return null;
  }
}

/**
 * Deletes an upload's R2 objects (original + extracted JSON). When the file
 * extension is unknown, tries all supported extensions.
 */
export async function deleteUploadObjects(
  fileId: string,
  fileExtension?: string | null,
): Promise<void> {
  await deleteUploadObject(extractedObjectKey(fileId));

  if (fileExtension && fileExtension !== URL_UPLOAD_EXTENSION) {
    await deleteUploadObject(originalObjectKey(fileId, fileExtension));
    return;
  }
  if (fileExtension === URL_UPLOAD_EXTENSION) {
    // URL extractions store no original object.
    return;
  }
  await Promise.all(
    SUPPORTED_UPLOAD_EXTENSIONS.map((ext) =>
      deleteUploadObject(originalObjectKey(fileId, ext)),
    ),
  );
}
