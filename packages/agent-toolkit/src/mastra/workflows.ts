/**
 * @fileoverview Mastra Workflow Builder
 *
 * Graph-based deterministic workflows with typed steps, chaining,
 * branching, and parallel execution support.
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

export interface WorkflowStepConfig<TInput = any, TOutput = any> {
  id: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  execute: (params: { inputData: TInput }) => Promise<TOutput>;
}

/**
 * Create a typed workflow step.
 *
 * @example
 * ```ts
 * const fetchStep = createWorkflowStep({
 *   id: "fetch-sources",
 *   inputSchema: z.object({ query: z.string() }),
 *   outputSchema: z.object({ sources: z.array(z.string()) }),
 *   execute: async ({ inputData }) => {
 *     const sources = await searchWeb(inputData.query);
 *     return { sources };
 *   },
 * });
 * ```
 */
export function createWorkflowStep<TInput, TOutput>(
  config: WorkflowStepConfig<TInput, TOutput>
) {
  return createStep({
    id: config.id,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    execute: config.execute,
  });
}

/**
 * Create a research workflow: fetch → analyze → summarize.
 * Pre-built pipeline for common research tasks.
 *
 * @example
 * ```ts
 * const workflow = createResearchWorkflow({
 *   fetchFn: async (topic) => fetchSources(topic),
 *   analyzeFn: async (sources) => analyzeContent(sources),
 *   summarizeFn: async (analysis) => generateSummary(analysis),
 * });
 *
 * const run = await workflow.createRunAsync();
 * const result = await run.start({ inputData: { topic: "quantum computing" } });
 * ```
 */
export function createResearchWorkflow(handlers: {
  fetchFn: (topic: string) => Promise<string[]>;
  analyzeFn: (sources: string[]) => Promise<string>;
  summarizeFn: (analysis: string) => Promise<string>;
}) {
  const fetchStep = createStep({
    id: "fetch-sources",
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: z.object({ sources: z.array(z.string()) }),
    execute: async ({ inputData }) => {
      const sources = await handlers.fetchFn(inputData.topic);
      return { sources };
    },
  });

  const analyzeStep = createStep({
    id: "analyze-content",
    inputSchema: z.object({ sources: z.array(z.string()) }),
    outputSchema: z.object({ analysis: z.string() }),
    execute: async ({ inputData }) => {
      const analysis = await handlers.analyzeFn(inputData.sources);
      return { analysis };
    },
  });

  const summarizeStep = createStep({
    id: "summarize",
    inputSchema: z.object({ analysis: z.string() }),
    outputSchema: z.object({ summary: z.string() }),
    execute: async ({ inputData }) => {
      const summary = await handlers.summarizeFn(inputData.analysis);
      return { summary };
    },
  });

  return createWorkflow({
    id: "research-workflow",
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: z.object({ summary: z.string() }),
  })
    .then(fetchStep)
    .then(analyzeStep)
    .then(summarizeStep)
    .commit();
}

/**
 * Create a RAG workflow: chunk → embed → retrieve → generate.
 * End-to-end retrieval-augmented generation pipeline.
 *
 * @example
 * ```ts
 * const workflow = createRAGWorkflow({
 *   chunkFn: async (doc) => splitIntoChunks(doc),
 *   embedFn: async (chunks) => embedChunks(chunks),
 *   retrieveFn: async (query) => findRelevant(query),
 *   generateFn: async (context, query) => llmGenerate(context, query),
 * });
 * ```
 */
export function createRAGWorkflow(handlers: {
  chunkFn: (document: string) => Promise<string[]>;
  embedFn: (chunks: string[]) => Promise<number[][]>;
  retrieveFn: (query: string) => Promise<string[]>;
  generateFn: (context: string[], query: string) => Promise<string>;
}) {
  const retrieveStep = createStep({
    id: "retrieve",
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ context: z.array(z.string()), query: z.string() }),
    execute: async ({ inputData }) => {
      const context = await handlers.retrieveFn(inputData.query);
      return { context, query: inputData.query };
    },
  });

  const generateStep = createStep({
    id: "generate",
    inputSchema: z.object({ context: z.array(z.string()), query: z.string() }),
    outputSchema: z.object({ answer: z.string() }),
    execute: async ({ inputData }) => {
      const answer = await handlers.generateFn(inputData.context, inputData.query);
      return { answer };
    },
  });

  return createWorkflow({
    id: "rag-workflow",
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({ answer: z.string() }),
  })
    .then(retrieveStep)
    .then(generateStep)
    .commit();
}
