/**
 * @fileoverview Context engine — the message-preparation pipeline of the
 * LobeChat chat engine, ported from `apps/qwk-in-lobe/packages/context-engine`.
 *
 * Before every model call the agent runtime runs the conversation through a
 * pipeline of processors (system-role injection, history truncation, the
 * force-finish summary prompt, clean-up). Each processor takes the pipeline
 * context and returns a new one, so the order of the pipeline is the order the
 * transformations apply in.
 *
 * qwk-in-lobe is a separate pnpm workspace, so this is a self-contained port
 * rather than an import of `@lobechat/context-engine`. Only the processors the
 * qwksearch-web chat needs are ported; the rest of LobeChat's (group chats,
 * agent documents, memory, …) have no counterpart here.
 */

import type { ModelMessage } from "ai";

export interface PipelineContext {
  abortReason?: string;
  readonly initialState: { messages: ModelMessage[] };
  isAborted: boolean;
  messages: ModelMessage[];
  metadata: Record<string, any>;
}

export interface PipelineResult {
  abortReason?: string;
  isAborted: boolean;
  messages: ModelMessage[];
  metadata: Record<string, any>;
  stats: {
    processedCount: number;
    processorDurations: Record<string, number>;
    totalDuration: number;
  };
}

export interface ContextProcessor {
  name: string;
  process: (context: PipelineContext) => Promise<PipelineContext>;
}

export interface ContextEngineConfig {
  pipeline: ContextProcessor[];
  debug?: boolean;
  logger?: (message: string, level?: "info" | "warn" | "error") => void;
}

/**
 * ContextEngine — runs its processors in order over the conversation.
 *
 * A processor that throws stops the pipeline and the error propagates
 * unchanged, so callers see the real failure rather than a wrapper.
 */
export class ContextEngine {
  private processors: ContextProcessor[] = [];
  private readonly options: { debug: boolean; logger?: ContextEngineConfig["logger"] };

  constructor(config: ContextEngineConfig) {
    const { pipeline, ...options } = config;
    this.processors = [...pipeline];
    this.options = { debug: false, ...options };
  }

  addProcessor(processor: ContextProcessor): this {
    this.processors.push(processor);
    return this;
  }

  removeProcessor(name: string): this {
    this.processors = this.processors.filter((p) => p.name !== name);
    return this;
  }

  getProcessors(): ContextProcessor[] {
    return [...this.processors];
  }

  clear(): this {
    this.processors = [];
    return this;
  }

  async process(input: { messages: ModelMessage[]; metadata?: Record<string, any> }): Promise<PipelineResult> {
    const startTime = Date.now();
    const processorDurations: Record<string, number> = {};

    let context: PipelineContext = {
      initialState: { messages: input.messages },
      isAborted: false,
      messages: [...input.messages],
      metadata: { ...input.metadata },
    };

    let processedCount = 0;

    for (const processor of this.processors) {
      if (context.isAborted) break;

      const processorStartTime = Date.now();
      try {
        context = await processor.process(context);
        processedCount++;
      } finally {
        processorDurations[processor.name] = Date.now() - processorStartTime;
      }
      if (this.options.debug) {
        this.options.logger?.(
          `[ContextEngine] ${processor.name}: ${context.messages.length} messages`,
          "info",
        );
      }
    }

    return {
      abortReason: context.abortReason,
      isAborted: context.isAborted,
      messages: context.messages,
      metadata: context.metadata,
      stats: {
        processedCount,
        processorDurations,
        totalDuration: Date.now() - startTime,
      },
    };
  }

  clone(): ContextEngine {
    return new ContextEngine({ pipeline: [...this.processors], ...this.options });
  }

  validate(): { errors: string[]; valid: boolean } {
    const errors: string[] = [];
    const names = this.processors.map((p) => p.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) errors.push(`Found duplicate processor names: ${duplicates.join(", ")}`);
    if (this.processors.length === 0) errors.push("No processors in pipeline");
    this.processors.forEach((processor) => {
      if (!processor.name) errors.push("Processor missing name");
      if (typeof processor.process !== "function")
        errors.push(`Processor [${processor.name}] missing process method`);
    });
    return { errors, valid: errors.length === 0 };
  }
}

// =============================================================================
// Processors
// =============================================================================

/**
 * Joins system-role sections into the leading system message, creating it if
 * there is none — LobeChat's `BaseSystemRoleProvider` join logic.
 */
const injectSystemRole = (context: PipelineContext, content: string): PipelineContext => {
  const [first, ...rest] = context.messages;
  if (first && first.role === "system") {
    return {
      ...context,
      messages: [{ role: "system", content: `${first.content}\n\n${content}` }, ...rest],
    };
  }
  return { ...context, messages: [{ role: "system", content }, ...context.messages] };
};

/**
 * Injects the agent's system role (the web-browsing tool's role, the focus
 * mode's instructions and the user's own instructions) as the system message.
 */
export class SystemRoleInjector implements ContextProcessor {
  readonly name = "SystemRoleInjector";

  constructor(private readonly config: { systemRole?: string }) {}

  async process(context: PipelineContext): Promise<PipelineContext> {
    const systemRole = this.config.systemRole;
    if (!systemRole || systemRole.trim() === "") return context;
    const next = injectSystemRole(context, systemRole);
    next.metadata = { ...next.metadata, systemRoleInjected: true };
    return next;
  }
}

/**
 * Keeps only the last `historyCount` prior turns. The current turn (the last
 * user message and everything after it — the tool calls and results of this
 * run) is always kept, so truncation never separates a tool call from its
 * result.
 */
export class HistoryTruncateProcessor implements ContextProcessor {
  readonly name = "HistoryTruncate";

  constructor(private readonly config: { enableHistoryCount?: boolean; historyCount?: number }) {}

  async process(context: PipelineContext): Promise<PipelineContext> {
    const { enableHistoryCount = true, historyCount } = this.config;
    if (!enableHistoryCount || historyCount === undefined || historyCount < 0) return context;

    const messages = context.messages;
    let currentTurnStart = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        currentTurnStart = i;
        break;
      }
    }
    if (currentTurnStart <= 0) return context;

    const leading = messages.slice(0, currentTurnStart).filter((m) => m.role === "system");
    const history = messages.slice(0, currentTurnStart).filter((m) => m.role !== "system");
    const kept = historyCount === 0 ? [] : history.slice(-historyCount);

    return {
      ...context,
      messages: [...leading, ...kept, ...messages.slice(currentTurnStart)],
      metadata: { ...context.metadata, historyTruncated: history.length - kept.length },
    };
  }
}

/**
 * When the agent has used up its step budget, tells the model to answer from
 * what it has gathered instead of calling more tools.
 */
export class ForceFinishSummaryInjector implements ContextProcessor {
  readonly name = "ForceFinishSummaryInjector";

  constructor(private readonly config: { enabled: boolean }) {}

  async process(context: PipelineContext): Promise<PipelineContext> {
    if (!this.config.enabled) return context;
    return {
      ...context,
      messages: [
        ...context.messages,
        // LobeChat sends this as a system message; a user turn is used here
        // because some providers reject system messages after the first turn.
        {
          role: "user",
          content:
            "You have reached the maximum step limit. Please summarize your progress and provide a final response. Do not attempt to use any tools.",
        },
      ],
      metadata: { ...context.metadata, forceFinishInjected: true },
    };
  }
}

/** Drops messages with no content (empty strings, empty part arrays). */
export class MessageCleanupProcessor implements ContextProcessor {
  readonly name = "MessageCleanup";

  async process(context: PipelineContext): Promise<PipelineContext> {
    return {
      ...context,
      messages: context.messages.filter((message) => {
        const content = message.content as unknown;
        if (typeof content === "string") return content.trim().length > 0;
        if (Array.isArray(content)) return content.length > 0;
        return content != null;
      }),
    };
  }
}

/**
 * Rewrites tool calls and tool results as plain text, for a model that cannot
 * take tool messages. Results already gathered (e.g. the prefetched search)
 * still reach the model, as context in a user turn.
 */
export class ToolCallFlattenProcessor implements ContextProcessor {
  readonly name = "ToolCallFlatten";

  constructor(private readonly config: { enabled: boolean }) {}

  async process(context: PipelineContext): Promise<PipelineContext> {
    if (!this.config.enabled) return context;

    const messages: ModelMessage[] = [];
    for (const message of context.messages) {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        const text = message.content
          .map((part) => {
            if (part.type === "text") return part.text;
            if (part.type === "tool-call") return `(called ${part.toolName} with ${JSON.stringify(part.input)})`;
            return "";
          })
          .filter(Boolean)
          .join("\n");
        if (text) messages.push({ role: "assistant", content: text });
      } else if (message.role === "tool") {
        const text = message.content
          .map((part) => {
            if (part.type !== "tool-result") return "";
            const output = part.output;
            return output.type === "text" ? output.value : JSON.stringify("value" in output ? output.value : output);
          })
          .filter(Boolean)
          .join("\n\n");
        if (text) messages.push({ role: "user", content: `Tool results:\n${text}` });
      } else {
        messages.push(message);
      }
    }

    return { ...context, messages };
  }
}
