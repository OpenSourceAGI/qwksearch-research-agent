/**
 * @module research/search/doc-utils
 * @description Document utilities: fallback docs, reranking, and formatting.
 */
import type { Document } from "./document";
import path from "node:path";
import fs from "node:fs";

/**
 * Resolves uploaded file ids to their extracted text content. Hosts that
 * store uploads remotely (e.g. Cloudflare R2) register a loader via
 * {@link setUploadedFileLoader}; without one, rerankDocs falls back to
 * reading `uploads/{fileId}-extracted.json` from the local filesystem.
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

  // Local filesystem fallback for self-hosted setups
  const filesData: { fileName: string; content: string }[] = [];
  for (const file of fileIds) {
    try {
      const contentPath =
        path.join(process.cwd(), "uploads", file) + "-extracted.json";
      const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
      filesData.push({ fileName: content.title, content: content.content });
    } catch {
      // Skip files that are missing or unreadable
    }
  }
  return filesData;
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

export async function rerankDocs(
  query: string,
  docs: Document[],
  fileIds: string[],
  optimizationMode: "speed" | "balanced" | "quality",
): Promise<Document[]> {
  if (docs.length === 0 && fileIds.length === 0) {
    return docs;
  }

  const filesData = await loadUploadedFiles(fileIds);

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
