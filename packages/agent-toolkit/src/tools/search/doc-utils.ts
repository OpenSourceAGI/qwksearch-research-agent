/**
 * @module research/search/doc-utils
 * @description Document utilities: fallback docs, reranking, and formatting.
 */
import type { Document } from "./document";

export interface R2CredentialsInput {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Resolves uploaded file ids to their extracted text content. Hosts that
 * store uploads remotely (e.g. Cloudflare R2 keyed per user) register a
 * loader via {@link setUploadedFileLoader}; without one, rerankDocs falls
 * back to downloading `{fileId}-extracted.json` directly from R2 using the
 * S3-compatible credentials passed by the caller.
 */
export type UploadedFileLoader = (
  fileIds: string[],
) => Promise<{ fileName: string; content: string }[]>;

// Stored on globalThis so registration survives duplicate module instances
// (e.g. one bundled copy and one transpiled source copy of this package)
const LOADER_KEY = "__qwkUploadedFileLoader";

export function setUploadedFileLoader(loader: UploadedFileLoader) {
  (globalThis as any)[LOADER_KEY] = loader;
}

async function loadUploadedFiles(
  fileIds: string[],
  r2Credentials?: R2CredentialsInput,
): Promise<{ fileName: string; content: string }[]> {
  if (fileIds.length === 0) return [];

  const uploadedFileLoader: UploadedFileLoader | undefined = (
    globalThis as any
  )[LOADER_KEY];

  if (uploadedFileLoader) {
    try {
      return await uploadedFileLoader(fileIds);
    } catch (err) {
      console.error("[rerankDocs] uploaded file loader failed:", err);
      return [];
    }
  }

  // Fallback: fetch extracted JSON straight from R2 with the given credentials
  if (r2Credentials) {
    const results = await Promise.all(
      fileIds.map((fileId) => downloadExtractedContent(fileId, r2Credentials)),
    );
    return results.filter(
      (r): r is { fileName: string; content: string } => r !== null,
    );
  }

  return [];
}

export function buildFallbackDocs(query: string): Document[] {
  const trimmedQuery = (query || "").trim();
  const searchQuery = trimmedQuery.length > 0 ? trimmedQuery : "web search";
  const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  return [
    {
      pageContent:
        "No indexed sources were returned by the configured search providers for this query.",
      metadata: {
        title: `Search results for: ${searchQuery}`,
        url: fallbackUrl,
        source: "Google Search",
      },
    },
  ];
}

export function normalizeSourcesOutput(output: unknown, query: string): Document[] {
  if (Array.isArray(output) && output.length > 0) {
    return output as Document[];
  }
  return buildFallbackDocs(query);
}

async function downloadExtractedContent(fileId: string, r2Credentials: R2CredentialsInput): Promise<{ fileName: string; content: string } | null> {
  try {
    const { manageStorage } = await import("manage-storage");
    const config = {
      provider: "cloudflare" as const,
      BUCKET_NAME: r2Credentials.bucket,
      ACCESS_KEY_ID: r2Credentials.accessKeyId,
      SECRET_ACCESS_KEY: r2Credentials.secretAccessKey,
      BUCKET_URL: `https://${r2Credentials.accountId}.r2.cloudflarestorage.com`,
    };
    const extractedKey = `${fileId}-extracted.json`;
    const data = await manageStorage("download", { ...config, key: extractedKey });
    const parsed = JSON.parse(data);
    return { fileName: parsed.title || "Uploaded Document", content: parsed.content || "" };
  } catch (error) {
    console.error(`[rerankDocs] Failed to download extracted content for fileId ${fileId}:`, error);
    return null;
  }
}

export async function rerankDocs(
  query: string,
  docs: Document[],
  fileIds: string[],
  optimizationMode: "speed" | "balanced" | "quality",
  r2Credentials?: R2CredentialsInput,
): Promise<Document[]> {
  if (docs.length === 0 && fileIds.length === 0) {
    return docs;
  }

  const filesData = await loadUploadedFiles(fileIds, r2Credentials);

  if (query.toLocaleLowerCase() === "summarize") {
    return docs.slice(0, 15);
  }

  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0,
  );

  const fileDocs: Document[] = filesData.map((fileData) => ({
    pageContent: fileData.content,
    metadata: { title: fileData.fileName, url: "File" },
  }));

  // Combine file docs with web results, cap at 15
  return [...fileDocs, ...docsWithContent].slice(0, 15);
}

export function processDocs(docs: Document[]): string {
  return docs
    .map(
      (_, index) =>
        `${index + 1}. ${docs[index].metadata.title} ${docs[index].pageContent}`,
    )
    .join("\n");
}
