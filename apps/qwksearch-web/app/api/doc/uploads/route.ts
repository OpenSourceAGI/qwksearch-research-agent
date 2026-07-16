/**
 * @fileoverview File upload and management via Cloudflare R2.
 *
 * - `POST` (multipart) — uploads files (PDF, DOCX, TXT, MD, HTML), extracts
 *   text content, stores both original and extracted data, and records the
 *   upload for per-user quota accounting.
 * - `POST` (JSON `{ url }` or `{ urls }`) — extracts typed-in URLs via
 *   `extract-webpage` and stores them as attachable context files.
 * - `GET ?fileId=` — retrieves extracted content for a file.
 * - `GET` — lists the authenticated user's uploads with quota usage.
 * - `DELETE ?fileId=` — removes uploads (comma-separate ids for batch).
 * - `DELETE` (JSON `{ fileIds }`) — batch removes uploads.
 * - `DELETE ?all=true` — removes all of the user's uploads.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_REQUEST,
  SUPPORTED_UPLOAD_EXTENSIONS,
  URL_UPLOAD_EXTENSION,
  extractUploadText,
  storeUpload,
  getExtractedUpload,
  getUserUploads,
  getUserUploadQuota,
  deleteUploadObjects,
  deleteUploadRecords,
} from '@/lib/uploads';
import { getUserId } from '@/lib/auth/session';

interface FileRes {
  fileName: string;
  fileExtension: string;
  fileId: string;
  sizeBytes: number;
}

const newFileId = () => crypto.randomBytes(16).toString('hex');

/**
 * Handles multipart file uploads: validates count/size/type limits,
 * enforces the per-user quota, extracts text, and stores everything in R2.
 */
async function handleFileUpload(req: Request, userId: string | null) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    return NextResponse.json(
      { message: 'No files provided' },
      { status: 400 },
    );
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { message: `Too many files: maximum ${MAX_FILES_PER_REQUEST} files per upload` },
      { status: 400 },
    );
  }

  for (const file of files) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (
      !fileExtension ||
      !(SUPPORTED_UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension)
    ) {
      return NextResponse.json(
        {
          message: `File type not supported for "${file.name}". Supported types: ${SUPPORTED_UPLOAD_EXTENSIONS.join(', ')}`,
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          message: `File "${file.name}" is too large. Maximum size is ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB per file.`,
        },
        { status: 413 },
      );
    }
  }

  // Enforce the per-user storage quota for authenticated users.
  if (userId) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const quota = await getUserUploadQuota(userId, totalSize);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          message: `Storage quota exceeded. Used: ${Math.round(quota.used / 1024 / 1024)}MB / ${Math.round(quota.quota / 1024 / 1024)}MB`,
          usage: quota,
        },
        { status: 413 },
      );
    }
  }

  const processedFiles: FileRes[] = [];

  await Promise.all(
    files.map(async (file: File) => {
      const fileExtension = file.name.split('.').pop()!.toLowerCase();
      const fileId = newFileId();
      const buffer = Buffer.from(await file.arrayBuffer());

      const content = await extractUploadText(buffer, file.name, fileExtension);

      await storeUpload({
        fileId,
        fileName: file.name,
        fileExtension,
        size: file.size,
        userId,
        originalBuffer: buffer,
        extracted: { title: file.name, content },
      });

      processedFiles.push({
        fileName: file.name,
        fileExtension,
        fileId,
        sizeBytes: file.size,
      });
    }),
  );

  return NextResponse.json({ files: processedFiles });
}

/**
 * Handles JSON `{ url }` / `{ urls }` requests: extracts each URL's content
 * with `extract-webpage` and stores it as an attachable context file.
 */
async function handleUrlExtraction(req: Request, userId: string | null) {
  const body = (await req.json()) as { url?: string; urls?: string[] };
  const urls = (body.urls ?? (body.url ? [body.url] : []))
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u));

  if (urls.length === 0) {
    return NextResponse.json(
      { message: 'Provide a "url" or "urls" field with http(s) URLs to extract' },
      { status: 400 },
    );
  }

  if (urls.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { message: `Too many URLs: maximum ${MAX_FILES_PER_REQUEST} per request` },
      { status: 400 },
    );
  }

  const { extractContent } = await import('extract-webpage');

  const processedFiles: FileRes[] = [];
  const errors: { url: string; message: string }[] = [];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const article = await extractContent(url);
        if (!article || article.error || !article.html) {
          errors.push({
            url,
            message: `Could not extract content from ${url}`,
          });
          return;
        }

        const fileId = newFileId();
        const title = article.title || url;
        const content = article.html;
        const size = Buffer.byteLength(content, 'utf-8');

        await storeUpload({
          fileId,
          fileName: title,
          fileExtension: URL_UPLOAD_EXTENSION,
          size,
          userId,
          extracted: { title, content, url },
        });

        processedFiles.push({
          fileName: title,
          fileExtension: URL_UPLOAD_EXTENSION,
          fileId,
          sizeBytes: size,
        });
      } catch (error) {
        console.error(`[POST /api/doc/uploads] URL extraction failed for ${url}:`, error);
        errors.push({ url, message: `Could not extract content from ${url}` });
      }
    }),
  );

  if (processedFiles.length === 0) {
    return NextResponse.json(
      { message: errors[0]?.message ?? 'URL extraction failed', errors },
      { status: 422 },
    );
  }

  return NextResponse.json({ files: processedFiles, errors });
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return await handleUrlExtraction(req, userId);
    }
    return await handleFileUpload(req, userId);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  // Fetch extracted content for a specific file.
  if (fileId) {
    try {
      const extracted = await getExtractedUpload(fileId);
      if (!extracted) {
        return NextResponse.json({ message: 'File not found' }, { status: 404 });
      }
      return NextResponse.json(extracted);
    } catch (error) {
      console.error('Error fetching file:', error);
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
  }

  // List the authenticated user's uploads with quota usage.
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { message: 'Sign in to list your uploads' },
        { status: 401 },
      );
    }

    const [files, usage] = await Promise.all([
      getUserUploads(userId),
      getUserUploadQuota(userId),
    ]);

    return NextResponse.json({
      files: files.map((f) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        fileExtension: f.fileExtension,
        sizeBytes: f.size,
        createdAt: f.createdAt,
      })),
      usage: {
        used: usage.used,
        quota: usage.quota,
        remaining: usage.remaining,
      },
    });
  } catch (error) {
    console.error('Error listing uploads:', error);
    return NextResponse.json(
      { message: 'Failed to list uploads' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const fileIdParam = searchParams.get('fileId');
    const deleteAll = searchParams.get('all') === 'true';

    // Resolve which fileIds to delete: ?all=true, JSON body batch, or ?fileId=.
    let fileIds: string[] = [];
    if (deleteAll) {
      if (!userId) {
        return NextResponse.json(
          { message: 'Sign in to delete all uploads' },
          { status: 401 },
        );
      }
    } else if (fileIdParam) {
      fileIds = fileIdParam.split(',').map((id) => id.trim()).filter(Boolean);
    } else {
      const body = (await req.json().catch(() => null)) as
        | { fileIds?: string[] }
        | null;
      fileIds = (body?.fileIds ?? []).map(String).filter(Boolean);
      if (fileIds.length === 0) {
        return NextResponse.json(
          { message: 'Provide ?fileId=, ?all=true, or a JSON body with "fileIds"' },
          { status: 400 },
        );
      }
    }

    // Known extension per fileId, from quota records (authenticated) or the
    // ?ext= hint (single-file guest deletes).
    const extHint = searchParams.get('ext');
    const extensions = new Map<string, string | null>();
    fileIds.forEach((id) => extensions.set(id, extHint));

    if (userId) {
      const deletedRecords = await deleteUploadRecords(
        userId,
        deleteAll ? undefined : fileIds,
      );
      if (deleteAll) {
        fileIds = deletedRecords.map((r) => r.fileId);
      }
      deletedRecords.forEach((r) => extensions.set(r.fileId, r.fileExtension));
    }

    const results = await Promise.allSettled(
      fileIds.map((id) => deleteUploadObjects(id, extensions.get(id))),
    );

    return NextResponse.json({
      success: true,
      deleted: fileIds.map((id, i) => ({
        fileId: id,
        success: results[i].status === 'fulfilled',
      })),
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { message: 'Failed to delete file' },
      { status: 500 },
    );
  }
}
