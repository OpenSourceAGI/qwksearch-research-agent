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

/** The payload resolved for an uploaded fileId. */
export interface LoadedUpload {
  title: string;
  content: string;
  /** MIME type for image uploads (e.g. `"image/png"`). */
  mediaType?: string;
  /** `data:`/`http(s)` URL of an image upload, passed to the LLM as image content. */
  image?: string;
}

/** An image attachment resolved from an uploaded fileId. */
export interface UploadImageAttachment {
  mediaType: string;
  /** `data:`/`http(s)` URL of the image, ready for an AI SDK image content part. */
  image: string;
}

/**
 * Resolves an uploaded fileId to its extracted payload. Hosts register a loader
 * (e.g. reading the native R2 binding) so the search pipeline does not depend
 * on filesystem or credential-based access. Image uploads additionally carry
 * `mediaType` and `image` so they can be passed to the LLM directly.
 */
export type UploadFileLoader = (fileId: string) => Promise<LoadedUpload | null>;

let uploadFileLoader: UploadFileLoader | null = null;

/**
 * Registers the loader used by {@link rerankDocs} to resolve uploaded
 * fileIds to extracted content. The registered loader takes precedence over
 * the S3-credentials fallback.
 */
export function registerUploadFileLoader(loader: UploadFileLoader): void {
  uploadFileLoader = loader;
}

async function downloadExtractedContent(fileId: string, r2Credentials: R2CredentialsInput): Promise<LoadedUpload | null> {
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
    return {
      title: parsed.title || "Uploaded Document",
      content: parsed.content || "",
      ...(parsed.mediaType ? { mediaType: parsed.mediaType } : {}),
      ...(parsed.image ? { image: parsed.image } : {}),
    };
  } catch (error) {
    console.error(`[rerankDocs] Failed to download extracted content for fileId ${fileId}:`, error);
    return null;
  }
}

/**
 * Resolves a single uploaded fileId via the registered loader (preferred) or
 * the R2 credentials fallback. Returns `null` when neither can resolve it.
 */
async function resolveUpload(
  fileId: string,
  r2Credentials?: R2CredentialsInput,
): Promise<LoadedUpload | null> {
  if (uploadFileLoader) {
    try {
      const loaded = await uploadFileLoader(fileId);
      if (loaded) return loaded;
    } catch (error) {
      console.error(
        `[resolveUpload] Registered upload loader failed for fileId ${fileId}:`,
        error,
      );
    }
  }
  if (r2Credentials) {
    return downloadExtractedContent(fileId, r2Credentials);
  }
  return null;
}

/**
 * Resolves image attachments for the given uploaded fileIds so they can be
 * passed to the LLM as image content parts. Non-image uploads (documents) and
 * images stored without inline data are skipped.
 */
export async function loadUploadImages(
  fileIds: string[],
  r2Credentials?: R2CredentialsInput,
): Promise<UploadImageAttachment[]> {
  if (!fileIds || fileIds.length === 0) return [];

  const resolved = await Promise.all(
    fileIds.map((fileId) => resolveUpload(fileId, r2Credentials)),
  );

  return resolved
    .filter(
      (r): r is LoadedUpload =>
        r !== null && typeof r.image === "string" && r.image.length > 0,
    )
    .map((r) => ({
      mediaType: r.mediaType || "image/png",
      image: r.image as string,
    }));
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

  let filesData: LoadedUpload[] = [];

  if (fileIds.length > 0) {
    const results = await Promise.all(
      fileIds.map((fileId) => resolveUpload(fileId, r2Credentials)),
    );
    filesData = results.filter((r): r is LoadedUpload => r !== null);
  }

  // Uploaded documents must always reach the LLM. Build their docs up front so
  // every return path below keeps them in the answer context. Image uploads
  // carry no text content — they are passed separately as image parts (see
  // loadUploadImages) — so they are excluded here to avoid empty docs.
  const fileDocs: Document[] = filesData
    .filter((fileData) => fileData.content && fileData.content.length > 0)
    .map((fileData) => ({
      pageContent: fileData.content,
      metadata: { title: fileData.title, url: "File" },
    }));

  if (query.toLocaleLowerCase() === "summarize") {
    // Skip web-result reranking for an explicit "summarize" request, but keep
    // the uploaded file content — otherwise attachments are silently dropped
    // and never analysed.
    return [...fileDocs, ...docs].slice(0, 15);
  }

  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0,
  );

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
