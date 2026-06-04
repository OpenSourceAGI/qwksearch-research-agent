/**
 * @module research/search/doc-utils
 * @description Document utilities: fallback docs, reranking, and formatting.
 */
import { Document } from "@langchain/core/documents";
import path from "node:path";
import fs from "node:fs";

export function buildFallbackDocs(query: string): Document[] {
  const trimmedQuery = (query || "").trim();
  const searchQuery = trimmedQuery.length > 0 ? trimmedQuery : "web search";
  const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  return [
    new Document({
      pageContent:
        "No indexed sources were returned by the configured search providers for this query.",
      metadata: {
        title: `Search results for: ${searchQuery}`,
        url: fallbackUrl,
        source: "Google Search",
      },
    }),
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

  const filesData = fileIds.map((file) => {
    const filePath = path.join(process.cwd(), "uploads", file);
    const contentPath = filePath + "-extracted.json";
    const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
    return { fileName: content.title, content: content.content };
  });

  if (query.toLocaleLowerCase() === "summarize") {
    return docs.slice(0, 15);
  }

  const docsWithContent = docs.filter(
    (doc) => doc.pageContent && doc.pageContent.length > 0,
  );

  const fileDocs = filesData.map(
    (fileData) =>
      new Document({
        pageContent: fileData.content,
        metadata: { title: fileData.fileName, url: "File" },
      }),
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
