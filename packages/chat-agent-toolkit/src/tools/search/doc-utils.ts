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
 * Resolves every uploaded fileId once, in order.
 *
 * Two things here are deliberate, and both are about the 128MB an edge isolate
 * gets. An attachment arrives as a JSON object whose `image` field is a data
 * URL, so an 8MB picture is ~11MB of base64 that exists twice while it is
 * parsed — and a request may carry ten of them. So: resolved **sequentially**,
 * to keep one raw payload live at a time rather than ten; and resolved **once**
 * per request, with the result shared by the reranker and the image loader,
 * which between them used to fetch and parse every attachment twice over.
 *
 * Duplicate ids in the list collapse to one fetch. A file that cannot be
 * resolved is dropped, exactly as before.
 */
export async function loadUploads(
  fileIds: string[],
  r2Credentials?: R2CredentialsInput,
): Promise<LoadedUpload[]> {
  if (!fileIds || fileIds.length === 0) return [];

  const seen = new Set<string>();
  const loaded: LoadedUpload[] = [];

  for (const fileId of fileIds) {
    if (seen.has(fileId)) continue;
    seen.add(fileId);
    const upload = await resolveUpload(fileId, r2Credentials);
    if (upload) loaded.push(upload);
  }

  return loaded;
}

/**
 * Picks the image attachments out of already-resolved uploads, ready to be
 * passed to the LLM as image content parts. Documents and images stored
 * without inline data carry no `image`, so they drop out here.
 */
export function selectUploadImages(uploads: LoadedUpload[]): UploadImageAttachment[] {
  return uploads
    .filter((u) => typeof u.image === "string" && u.image.length > 0)
    .map((u) => ({
      mediaType: u.mediaType || "image/png",
      image: u.image as string,
    }));
}

/**
 * Resolves image attachments for the given uploaded fileIds so they can be
 * passed to the LLM as image content parts. Non-image uploads (documents) and
 * images stored without inline data are skipped.
 *
 * Pass `preloaded` when the uploads have already been resolved for this
 * request — {@link loadUploads} explains why fetching them twice is worth
 * avoiding.
 */
export async function loadUploadImages(
  fileIds: string[],
  r2Credentials?: R2CredentialsInput,
  preloaded?: LoadedUpload[],
): Promise<UploadImageAttachment[]> {
  if (preloaded) return selectUploadImages(preloaded);
  if (!fileIds || fileIds.length === 0) return [];
  return selectUploadImages(await loadUploads(fileIds, r2Credentials));
}

/**
 * Builds the answer context: uploaded file content first, then web results.
 *
 * Pass `preloaded` when the uploads have already been resolved for this
 * request — see {@link loadUploads}.
 */
export async function rerankDocs(
  query: string,
  docs: Document[],
  fileIds: string[],
  optimizationMode: "speed" | "balanced" | "quality",
  r2Credentials?: R2CredentialsInput,
  preloaded?: LoadedUpload[],
): Promise<Document[]> {
  if (docs.length === 0 && fileIds.length === 0) {
    return docs;
  }

  const filesData: LoadedUpload[] =
    preloaded ??
    (fileIds.length > 0 ? await loadUploads(fileIds, r2Credentials) : []);

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
