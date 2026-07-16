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

/**
 * Resolves an uploaded fileId to its extracted `{ title, content }` payload.
 * Hosts register a loader (e.g. reading the native R2 binding) so the search
 * pipeline does not depend on filesystem or credential-based access.
 */
export type UploadFileLoader = (
  fileId: string,
) => Promise<{ title: string; content: string } | null>;

let uploadFileLoader: UploadFileLoader | null = null;

/**
 * Registers the loader used by {@link rerankDocs} to resolve uploaded
 * fileIds to extracted content. The registered loader takes precedence over
 * the S3-credentials fallback.
 */
export function registerUploadFileLoader(loader: UploadFileLoader): void {
  uploadFileLoader = loader;
}

async function downloadExtractedContent(fileId: string, r2Credentials: R2CredentialsInput): Promise<{ title: string; content: string } | null> {
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
    return { title: parsed.title || "Uploaded Document", content: parsed.content || "" };
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

  let filesData: { title: string; content: string }[] = [];

  if (fileIds.length > 0) {
    const results = await Promise.all(
      fileIds.map(async (fileId) => {
        if (uploadFileLoader) {
          try {
            const loaded = await uploadFileLoader(fileId);
            if (loaded) return loaded;
          } catch (error) {
            console.error(
              `[rerankDocs] Registered upload loader failed for fileId ${fileId}:`,
              error,
            );
          }
        }
        if (r2Credentials) {
          return downloadExtractedContent(fileId, r2Credentials);
        }
        return null;
      }),
    );
    filesData = results.filter((r) => r !== null);
  }

  if (query.toLocaleLowerCase() === "summarize") {
    return docs.slice(0, 15);
  }

  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0,
  );

  const fileDocs: Document[] = filesData.map((fileData) => ({
    pageContent: fileData.content,
    metadata: { title: fileData.title, url: "File" },
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
