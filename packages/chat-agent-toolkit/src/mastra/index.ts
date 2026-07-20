/**
 * @fileoverview Mastra Integration Module
 *
 * Full-featured Mastra AI framework integration providing agents, workflows,
 * RAG, evals, telemetry, and model routing. Built on @mastra/core with
 * Vercel AI SDK compatibility.
 *
 * @module mastra
 */

export { createMastraAgent, createToolAgent, type MastraAgentConfig } from "./agents";
export {
  createWorkflowStep,
  createResearchWorkflow,
  createRAGWorkflow,
  type WorkflowStepConfig,
} from "./workflows";
export {
  MastraRAG,
  createRAGPipeline,
  type RAGConfig,
  type RAGDocument,
  type RAGChunk,
  type RAGRetrievalResult,
} from "./rag";
export {
  factualityEval,
  relevanceEval,
  coherenceEval,
  toxicityEval,
  runEvalSuite,
  type EvalResult,
  type EvalSuiteResult,
} from "./evals";
export {
  createMastraInstance,
  type MastraInstanceConfig,
  type TelemetryConfig,
} from "./telemetry";
export {
  createModelRouter,
  loadMastraModel,
  type ModelRouterConfig,
  type RoutingStrategy,
} from "./model-routing";
