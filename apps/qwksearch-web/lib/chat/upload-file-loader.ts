/**
 * @fileoverview Registers the upload file loader with the search pipeline.
 *
 * When a chat message references uploaded fileIds, the search pipeline's
 * reranker resolves them to extracted content through this loader, which
 * reads the `<fileId>-extracted.json` objects from R2 (native Workers
 * binding, with S3-compatible API fallback) instead of the local
 * filesystem.
 */

import { registerUploadFileLoader } from "extract-webpage/search";
import { getExtractedUpload } from "@/lib/uploads";

let registered = false;

/**
 * Registers the R2-backed upload loader with the search pipeline.
 * Safe to call on every request; registration only happens once.
 */
export function ensureUploadFileLoaderRegistered(): void {
  if (registered) return;
  registered = true;

  registerUploadFileLoader(async (fileId: string) => {
    const extracted = await getExtractedUpload(fileId);
    if (!extracted) return null;
    return { title: extracted.title, content: extracted.content };
  });
}
