/**
 * @fileoverview Mastra RAG (Retrieval-Augmented Generation)
 *
 * Document processing, chunking, embedding, and vector-store retrieval.
 * Uses Vercel AI SDK embeddings with pluggable vector backends.
 */

import { embed, embedMany } from "ai";

export interface RAGConfig {
  embeddingModel: any;
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface RAGRetrievalResult {
  chunk: RAGChunk;
  score: number;
}

/**
 * In-memory RAG pipeline with document chunking, embedding, and retrieval.
 * For production, swap the vector store with Pinecone, Qdrant, or pgvector.
 *
 * @example
 * ```ts
 * import { MastraRAG } from "chat-agent-toolkit/mastra";
 * import { openai } from "@ai-sdk/openai";
 *
 * const rag = new MastraRAG({
 *   embeddingModel: openai.embedding("text-embedding-3-small"),
 *   chunkSize: 512,
 *   topK: 5,
 * });
 *
 * await rag.ingest([
 *   { id: "doc1", content: "Long document text..." },
 * ]);
 *
 * const results = await rag.retrieve("What is the main topic?");
 * ```
 */
export class MastraRAG {
  private config: Required<RAGConfig>;
  private chunks: RAGChunk[] = [];

  constructor(config: RAGConfig) {
    this.config = {
      embeddingModel: config.embeddingModel,
      chunkSize: config.chunkSize ?? 512,
      chunkOverlap: config.chunkOverlap ?? 64,
      topK: config.topK ?? 5,
    };
  }

  /**
   * Split text into overlapping chunks of configured size.
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    const { chunkSize, chunkOverlap } = this.config;

    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      chunks.push(words.slice(start, end).join(" "));
      start += chunkSize - chunkOverlap;
    }

    return chunks;
  }

  /**
   * Ingest documents: chunk, embed, and store.
   */
  async ingest(documents: RAGDocument[]): Promise<number> {
    let totalChunks = 0;

    for (const doc of documents) {
      const textChunks = this.splitIntoChunks(doc.content);

      const { embeddings } = await embedMany({
        model: this.config.embeddingModel,
        values: textChunks,
      });

      for (let i = 0; i < textChunks.length; i++) {
        this.chunks.push({
          id: `${doc.id}_chunk_${i}`,
          documentId: doc.id,
          text: textChunks[i],
          embedding: embeddings[i],
          metadata: doc.metadata,
        });
      }

      totalChunks += textChunks.length;
    }

    return totalChunks;
  }

  /**
   * Retrieve relevant chunks for a query using cosine similarity.
   */
  async retrieve(query: string): Promise<RAGRetrievalResult[]> {
    if (this.chunks.length === 0) return [];

    const { embedding } = await embed({
      model: this.config.embeddingModel,
      value: query,
    });

    const scored = this.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(embedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, this.config.topK);
  }

  /**
   * Retrieve and format context string for LLM consumption.
   */
  async getContext(query: string): Promise<string> {
    const results = await this.retrieve(query);
    if (results.length === 0) return "";

    return results
      .map((r, i) => `[${i + 1}] (score: ${r.score.toFixed(3)}) ${r.chunk.text}`)
      .join("\n\n");
  }

  /**
   * Get total chunk count in the store.
   */
  get size(): number {
    return this.chunks.length;
  }

  /**
   * Clear all stored chunks.
   */
  clear(): void {
    this.chunks = [];
  }
}

/**
 * Factory for creating a configured RAG pipeline.
 */
export function createRAGPipeline(config: RAGConfig): MastraRAG {
  return new MastraRAG(config);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}
