/**
 * @fileoverview Server-side helpers for user file uploads stored in
 * Cloudflare R2. Handles storage access (native R2 binding when running on
 * Workers, S3-compatible API credentials otherwise), text extraction for
 * PDF / DOCX / TXT / HTML uploads and typed-in URLs, and per-user storage
 * quota accounting backed by the `uploads` D1 table.
 */
import crypto from "crypto";
import { and, eq, inArray } from "drizzle-orm";

import { getCloudflareContext } from "@/lib/cloudflare-context";
import { getEnv } from "@/lib/env";
import { getDB } from "@/lib/database";
import { uploads, user as userTable } from "@/lib/database/schema";
import type { R2Credentials } from "@/types/fileSource";

/** Max size of a single uploaded file (bytes). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
/** Max number of files accepted in one upload request (form field limit). */
export const MAX_FILES_PER_UPLOAD = 10;
/** Default total storage allowed per user across all uploads (bytes).
 * Can be raised per user via the `user.storage_quota_bytes` column. */
export const USER_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB
/** File extensions that can be uploaded and extracted. */
export const SUPPORTED_UPLOAD_EXTS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "html",
  "htm",
];

export interface UploadRecord {
  fileId: string;
  fileName: string;
  fileExtension: string;
  size: number;
  createdAt: number;
}

export interface ExtractedFileData {
  title: string;
  content: string;
  html?: string;
  url?: string;
}

/** R2 object key for the original uploaded file. */
export function originalKey(userId: string, fileId: string, ext: string) {
  return `uploads/${userId}/${fileId}.${ext}`;
}

/** R2 object key for the extracted-text JSON companion object. */
export function extractedKey(userId: string, fileId: string) {
  return `uploads/${userId}/${fileId}-extracted.json`;
}

export function generateFileId() {
  return crypto.randomBytes(16).toString("hex");
}

// ---------------------------------------------------------------------------
// Storage access: prefer the native R2 bucket binding (Workers), fall back to
// the S3-compatible API via manage-storage using R2_* env credentials.
// ---------------------------------------------------------------------------

function getR2Binding(): any | null {
  try {
    const { env } = getCloudflareContext();
    // Bucket binding is named R2 in wrangler.jsonc; UPLOADS kept for
    // backwards compatibility with older configs
    const bucket = env.R2 ?? env.UPLOADS;
    if (bucket && typeof bucket.put === "function") {
      return bucket;
    }
  } catch {
    // not running on Workers
  }
  return null;
}

function getR2Credentials(): R2Credentials {
  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_UPLOADS_BUCKET") || "qwksearch-uploads";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Uploads storage is not configured: add an R2 bucket binding or R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY env vars",
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export async function putObject(key: string, body: Buffer | string) {
  const bucket = getR2Binding();
  if (bucket) {
    await bucket.put(key, body);
    return;
  }
  const { uploadFile } = await import("@/lib/integrations/cloudStorageService");
  await uploadFile(
    { provider: "r2", credentials: getR2Credentials() },
    key,
    typeof body === "string" ? body : body,
  );
}

export async function getObjectText(key: string): Promise<string | null> {
  const bucket = getR2Binding();
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return await obj.text();
  }
  const { downloadFile } = await import(
    "@/lib/integrations/cloudStorageService"
  );
  try {
    return await downloadFile(
      { provider: "r2", credentials: getR2Credentials() },
      key,
    );
  } catch {
    return null;
  }
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  const bucket = getR2Binding();
  if (bucket) {
    await bucket.delete(keys);
    return;
  }
  const { deleteFile } = await import("@/lib/integrations/cloudStorageService");
  const credentials = getR2Credentials();
  await Promise.allSettled(
    keys.map((key) => deleteFile({ provider: "r2", credentials }, key)),
  );
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Runs the extract-webpage / extract-pdf pipeline on an uploaded file buffer
 * and returns `{ title, content, html }` suitable for the chat context.
 */
export async function extractFileContent(
  fileName: string,
  ext: string,
  buffer: Buffer,
): Promise<ExtractedFileData> {
  if (ext === "txt" || ext === "md") {
    return { title: fileName, content: buffer.toString("utf-8") };
  }

  if (ext === "html" || ext === "htm") {
    const rawHtml = buffer.toString("utf-8");
    try {
      const { extractContent } = await import(
        "extract-webpage/url-to-content/url-to-content"
      );
      const article = await extractContent(rawHtml);
      if (article?.html) {
        return {
          title: article.title || fileName,
          content: htmlToText(article.html),
          html: article.html,
        };
      }
    } catch (err) {
      console.error("[uploads] html extraction failed, using raw text:", err);
    }
    return { title: fileName, content: htmlToText(rawHtml) };
  }

  if (ext === "pdf") {
    // @ts-ignore extract-pdf types resolve from its build output; the web
    // build aliases the package to source (see vite.config.ts)
    const { convertPDFToHTML } = await import("extract-pdf");
    const result: any = await convertPDFToHTML(buffer);
    if (result?.error || !result?.html) {
      throw new Error(
        `PDF extraction failed: ${result?.error || "no content"}`,
      );
    }
    return {
      title: result.title || fileName,
      content: htmlToText(result.html),
      html: result.html,
    };
  }

  if (ext === "docx") {
    const { extractContent } = await import(
      "extract-webpage/url-to-content/url-to-content"
    );
    const article = await extractContent(new Uint8Array(buffer));
    if (article?.error || !article?.html) {
      throw new Error(
        `DOCX extraction failed: ${article?.error || "no content"}`,
      );
    }
    return {
      title: article.title || fileName,
      content: htmlToText(article.html),
      html: article.html,
    };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Runs extract-webpage on a typed-in URL (webpage, PDF, DOCX, YouTube…)
 * and returns extracted text for use as an attached context file.
 */
export async function extractUrlContent(
  url: string,
): Promise<ExtractedFileData> {
  const { extractContent } = await import(
    "extract-webpage/url-to-content/url-to-content"
  );
  const article = await extractContent(url);
  if (article?.error || !article?.html) {
    throw new Error(
      `URL extraction failed: ${article?.error || "no content found"}`,
    );
  }
  return {
    title: article.title || url,
    content: htmlToText(article.html),
    html: article.html,
    url,
  };
}

// ---------------------------------------------------------------------------
// Quota accounting (D1 `uploads` table)
// ---------------------------------------------------------------------------

export async function getUserUsageBytes(
  db: ReturnType<typeof getDB>,
  userId: string,
): Promise<number> {
  const rows = await db.query.uploads.findMany({
    where: eq(uploads.userId, userId),
    columns: { size: true },
  });
  return rows.reduce((sum, row) => sum + (row.size ?? 0), 0);
}

/**
 * Returns the user's storage quota in bytes: the per-user
 * `storage_quota_bytes` override when set, otherwise the 1 GB default.
 */
export async function getUserQuotaBytes(
  db: ReturnType<typeof getDB>,
  userId: string,
): Promise<number> {
  try {
    const row = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { storageQuotaBytes: true },
    });
    return row?.storageQuotaBytes || USER_QUOTA_BYTES;
  } catch {
    return USER_QUOTA_BYTES;
  }
}

export async function listUserUploads(
  db: ReturnType<typeof getDB>,
  userId: string,
): Promise<UploadRecord[]> {
  const rows = await db.query.uploads.findMany({
    where: eq(uploads.userId, userId),
  });
  return rows
    .map((row) => ({
      fileId: row.fileId,
      fileName: row.fileName,
      fileExtension: row.fileExtension,
      size: row.size,
      createdAt:
        row.createdAt instanceof Date
          ? Math.floor(row.createdAt.getTime() / 1000)
          : Number(row.createdAt),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function recordUpload(
  db: ReturnType<typeof getDB>,
  record: {
    fileId: string;
    userId: string;
    fileName: string;
    fileExtension: string;
    size: number;
  },
) {
  await db.insert(uploads).values(record).execute();
}

/**
 * Deletes the given uploads (R2 objects + DB rows) for a user.
 * Only rows owned by `userId` are touched. Returns the deleted file ids.
 */
export async function deleteUserUploads(
  db: ReturnType<typeof getDB>,
  userId: string,
  fileIds: string[],
): Promise<string[]> {
  if (fileIds.length === 0) return [];

  const rows = await db.query.uploads.findMany({
    where: and(eq(uploads.userId, userId), inArray(uploads.fileId, fileIds)),
  });
  if (rows.length === 0) return [];

  const keys = rows.flatMap((row) => [
    originalKey(userId, row.fileId, row.fileExtension),
    extractedKey(userId, row.fileId),
  ]);

  try {
    await deleteObjects(keys);
  } catch (err) {
    console.error("[uploads] R2 delete failed (removing DB rows anyway):", err);
  }

  const deletedIds = rows.map((row) => row.fileId);
  await db
    .delete(uploads)
    .where(and(eq(uploads.userId, userId), inArray(uploads.fileId, deletedIds)))
    .execute();

  return deletedIds;
}
