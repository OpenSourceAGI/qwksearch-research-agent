/**
 * @fileoverview Registers the uploaded-file loader used by the search
 * pipeline's rerankDocs step. Uploaded files live in Cloudflare R2 (keyed
 * per user), so attached fileIds are resolved through the `uploads` D1
 * table and the extracted-text JSON is fetched from R2 instead of the
 * local filesystem default.
 */
import { setUploadedFileLoader } from "chat-agent-toolkit/tools/search/doc-utils";
import { inArray } from "drizzle-orm";

import { getDB } from "@/lib/database";
import { uploads } from "@/lib/database/schema";
import { extractedKey, getObjectText } from "@/lib/uploads";

let registered = false;

export function registerUploadFileLoader() {
  if (registered) return;
  registered = true;

  setUploadedFileLoader(async (fileIds: string[]) => {
    if (fileIds.length === 0) return [];

    const db = getDB();
    const rows = await db.query.uploads.findMany({
      where: inArray(uploads.fileId, fileIds),
    });

    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          const json = await getObjectText(
            extractedKey(row.userId, row.fileId),
          );
          if (!json) return null;
          const parsed = JSON.parse(json);
          return {
            fileName: parsed.title || row.fileName,
            content: String(parsed.content || ""),
          };
        } catch (err) {
          console.error(
            `[upload-file-loader] failed to load ${row.fileId}:`,
            err,
          );
          return null;
        }
      }),
    );

    return results.filter(
      (r): r is { fileName: string; content: string } =>
        r !== null && r.content.length > 0,
    );
  });
}
