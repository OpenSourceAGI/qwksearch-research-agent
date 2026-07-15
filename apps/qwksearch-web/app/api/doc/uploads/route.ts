/**
 * @fileoverview File upload and management via Cloudflare R2.
 *
 * POST (multipart) — uploads files (PDF, DOCX, TXT, MD, HTML), runs the
 * extract-webpage / extract-pdf pipeline on each, and stores both the
 * original file and the extracted text JSON in R2. Enforces a per-file size
 * limit, a per-request file count limit, and a 1 GB total storage quota per
 * user (tracked in the `uploads` D1 table).
 *
 * POST (JSON `{ url }`) — runs extract-webpage on a typed-in URL and stores
 * the extracted content as an attachable context file.
 *
 * GET — without params, lists the user's uploads with sizes and quota usage;
 * with `?fileId=`, returns the extracted content for one file.
 *
 * DELETE — removes uploads (R2 objects + DB rows). Accepts a single
 * `?fileId=`, a JSON body `{ fileIds: [...] }` for mass delete, or
 * `?all=true` to delete every upload owned by the user.
 */
import { NextResponse } from "next/server";

import { getDB } from "@/lib/database";
import { requireUserId } from "@/lib/auth/session";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
  USER_QUOTA_BYTES,
  SUPPORTED_UPLOAD_EXTS,
  generateFileId,
  originalKey,
  extractedKey,
  putObject,
  getObjectText,
  extractFileContent,
  extractUrlContent,
  getUserUsageBytes,
  listUserUploads,
  recordUpload,
  deleteUserUploads,
} from "@/lib/uploads";

interface FileRes {
  fileName: string;
  fileExtension: string;
  fileId: string;
  size: number;
}

function unauthorized(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json(
      { message: "Sign in to upload files" },
      { status: 401 },
    );
  }
  return null;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    return unauthorized(err) ?? NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 },
    );
  }

  const db = getDB();

  try {
    const contentType = req.headers.get("content-type") || "";

    // ---- Typed-in URL: extract with extract-webpage and store as a file ----
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!URL_PATTERN.test(url)) {
        return NextResponse.json(
          { message: "A valid http(s) URL is required" },
          { status: 400 },
        );
      }

      const extracted = await extractUrlContent(url);
      const extractedJson = JSON.stringify(extracted);
      const size = new TextEncoder().encode(extractedJson).length;

      const usage = await getUserUsageBytes(db, userId);
      if (usage + size > USER_QUOTA_BYTES) {
        return NextResponse.json(
          {
            message: `Storage limit reached: ${(usage / 1024 / 1024).toFixed(1)} MB of ${USER_QUOTA_BYTES / 1024 / 1024} MB used. Delete uploads in Settings to free space.`,
            usageBytes: usage,
            quotaBytes: USER_QUOTA_BYTES,
          },
          { status: 413 },
        );
      }

      const fileId = generateFileId();
      await putObject(extractedKey(userId, fileId), extractedJson);
      const fileName = extracted.title || url;
      await recordUpload(db, {
        fileId,
        userId,
        fileName,
        fileExtension: "url",
        size,
      });

      return NextResponse.json({
        files: [{ fileName, fileExtension: "url", fileId, size }],
      });
    }

    // ---- Multipart file upload ----
    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { message: `Too many files: at most ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 },
      );
    }

    // Validate extensions and per-file size before touching storage
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !SUPPORTED_UPLOAD_EXTS.includes(ext)) {
        return NextResponse.json(
          {
            message: `File type not supported: ${file.name}. Supported: ${SUPPORTED_UPLOAD_EXTS.join(", ")}`,
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            message: `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max file size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
          },
          { status: 413 },
        );
      }
    }

    // Enforce the 1 GB per-user quota including this batch
    const usage = await getUserUsageBytes(db, userId);
    const batchBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (usage + batchBytes > USER_QUOTA_BYTES) {
      return NextResponse.json(
        {
          message: `Storage limit reached: ${(usage / 1024 / 1024).toFixed(1)} MB of ${USER_QUOTA_BYTES / 1024 / 1024} MB used. Delete uploads in Settings to free space.`,
          usageBytes: usage,
          quotaBytes: USER_QUOTA_BYTES,
        },
        { status: 413 },
      );
    }

    const processedFiles: FileRes[] = [];
    const errors: { fileName: string; message: string }[] = [];

    for (const file of files) {
      const fileExtension = file.name.split(".").pop()!.toLowerCase();
      const fileId = generateFileId();
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        // Extract text first so a failed extraction doesn't leave orphaned
        // objects counted against the user's quota
        const extracted = await extractFileContent(
          file.name,
          fileExtension,
          buffer,
        );

        await putObject(originalKey(userId, fileId, fileExtension), buffer);
        await putObject(
          extractedKey(userId, fileId),
          JSON.stringify(extracted),
        );

        await recordUpload(db, {
          fileId,
          userId,
          fileName: file.name,
          fileExtension,
          size: file.size,
        });

        processedFiles.push({
          fileName: file.name,
          fileExtension,
          fileId,
          size: file.size,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[uploads] failed to process ${file.name}:`, message);
        errors.push({ fileName: file.name, message });
      }
    }

    if (processedFiles.length === 0) {
      return NextResponse.json(
        { message: errors[0]?.message || "Failed to process files", errors },
        { status: 500 },
      );
    }

    return NextResponse.json({ files: processedFiles, errors });
  } catch (error) {
    console.error("Error uploading file:", error);
    const message =
      error instanceof Error ? error.message : "An error has occurred.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    return unauthorized(err) ?? NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 },
    );
  }

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  // ---- List all uploads with quota usage ----
  if (!fileId) {
    try {
      const files = await listUserUploads(db, userId);
      const usageBytes = files.reduce((sum, file) => sum + file.size, 0);
      return NextResponse.json({
        files,
        usageBytes,
        quotaBytes: USER_QUOTA_BYTES,
      });
    } catch (error) {
      console.error("Error listing uploads:", error);
      return NextResponse.json(
        { message: "Failed to list uploads" },
        { status: 500 },
      );
    }
  }

  // ---- Fetch extracted content for one file ----
  try {
    const content = await getObjectText(extractedKey(userId, fileId));
    if (!content) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    return unauthorized(err) ?? NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 },
    );
  }

  const db = getDB();
  const { searchParams } = new URL(req.url);

  try {
    let fileIds: string[] = [];

    if (searchParams.get("all") === "true") {
      const files = await listUserUploads(db, userId);
      fileIds = files.map((file) => file.fileId);
    } else {
      const single = searchParams.get("fileId");
      if (single) {
        fileIds = [single];
      } else {
        const body = await req.json().catch(() => null);
        if (Array.isArray(body?.fileIds)) {
          fileIds = body.fileIds.filter(
            (id: unknown): id is string => typeof id === "string",
          );
        }
      }
    }

    if (fileIds.length === 0) {
      return NextResponse.json(
        { message: "Provide fileId, fileIds, or all=true" },
        { status: 400 },
      );
    }

    const deleted = await deleteUserUploads(db, userId, fileIds);

    return NextResponse.json({
      success: true,
      deleted,
      count: deleted.length,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { message: "Failed to delete files" },
      { status: 500 },
    );
  }
}
