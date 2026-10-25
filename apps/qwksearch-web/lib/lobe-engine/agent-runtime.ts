/**
 * @fileoverview Agent runtime — the step loop of the LobeChat chat engine,
 * ported from `apps/qwk-in-lobe/packages/agent-runtime` (`GeneralChatAgent`
 * and its `call_llm` / `call_tool` / `finish` executors).
 *
 * Each step prepares the conversation through the context engine, calls the
 * model with the tools, and then either finishes (the model answered) or runs
 * the tool calls the model made, appends their results and goes round again.
 * On the last allowed step the tools are switched off and the model is told
 * to answer from what it has, so a run always ends in an answer.
 *
 * LobeChat's runtime also handles human approval, sub-agents, context
 * compression and persistence between steps; none of those apply to a single
 * qwksearch-web chat request, so the loop here is the part that does.
 */

import { streamText, type LanguageModel, type ModelMessage, type ToolSet } from "ai";

export interface AgentToolCall {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export type LlmStreamEvent =
  | { type: "text"; text: string }
  | ({ type: "tool-call" } & AgentToolCall);

export interface CallLlmParams {
  model: LanguageModel;
  messages: ModelMessage[];
  tools?: ToolSet;
  /** `"none"` keeps the tools declared (so tool history stays valid) but unused. */
  toolChoice?: "auto" | "none";
  temperature?: number;
}

/** One model call, as a stream of text deltas and finished tool calls. */
export type CallLlm = (params: CallLlmParams) => AsyncIterable<LlmStreamEvent>;

/** The default `call_llm` executor: one AI SDK `streamText` step. */
export const streamTextCallLlm: CallLlm = async function* (params) {
  const result = streamText({
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    ...(params.tools && { tools: params.tools, toolChoice: params.toolChoice ?? "auto" }),
  });

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      if (part.text) yield { type: "text", text: part.text };
    } else if (part.type === "tool-call") {
      yield {
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
      };
    } else if (part.type === "error") {
      throw part.error instanceof Error ? part.error : new Error(String(part.error));
    }
  }
};

/** True for the errors providers return when a model cannot call tools. */
export const isToolsUnsupportedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /(support|allow)[^.]{0,40}tool|tool[^.]{0,40}(not supported|unsupported)|function call(ing)? is not supported/i.test(
    message,
  );
};

export interface AgentRunOptions {
  llm: LanguageModel;
  /** The conversation so far, ending with the user's message (and any prefetched tool turns). */
  messages: ModelMessage[];
  tools?: ToolSet;
  /** Most model calls in one run; the last one answers without tools. */
  maxSteps: number;
  temperature?: number;
  /** Builds the messages for one model call — the context engine. */
  buildContext: (
    messages: ModelMessage[],
    state: { forceFinish: boolean; toolsEnabled: boolean; step: number },
  ) => Promise<ModelMessage[]>;
  /** Runs one tool call and returns the text handed back to the model. */
  executeTool: (call: AgentToolCall) => Promise<string>;
  /** Receives answer text as it streams. */
  onText: (text: string) => Promise<void> | void;
  callLlm?: CallLlm;
  /**
   * Text a tool-calling step writes before its tool calls is a preamble, not
   * the answer. Text is held back until this many characters have arrived
   * without a tool call, then streamed; a tool call inside the window keeps the
   * preamble in the conversation but off the answer.
   */
  preambleBufferChars?: number;
}

export interface AgentRunResult {
  steps: number;
  toolCalls: number;
  finishReason: "completed" | "max_steps";
  toolsEnabled: boolean;
  text: string;
  messages: ModelMessage[];
}

/**
 * Runs the agent loop to completion. Throws whatever the model call throws,
 * except a "this model cannot use tools" error, after which the step is
 * retried with the tools off.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const callLlm = options.callLlm ?? streamTextCallLlm;
  const preambleBufferChars = options.preambleBufferChars ?? 160;
  const messages = [...options.messages];
  let toolsEnabled = Boolean(options.tools && Object.keys(options.tools).length > 0);
  let answerText = "";
  let toolCallCount = 0;

  for (let step = 0; step < options.maxSteps; step++) {
    const forceFinish = toolsEnabled && step === options.maxSteps - 1;

    const runStep = async () => {
      const prepared = await options.buildContext([...messages], { forceFinish, toolsEnabled, step });
      const calls: AgentToolCall[] = [];
      let stepText = "";
      let pending = "";
      let streaming = !toolsEnabled || forceFinish;

      const flush = async () => {
        if (!pending) return;
        const chunk = pending;
        pending = "";
        answerText += chunk;
        await options.onText(chunk);
      };

      for await (const event of callLlm({
        model: options.llm,
        messages: prepared,
        temperature: options.temperature,
        ...(toolsEnabled && { tools: options.tools, toolChoice: forceFinish ? "none" : "auto" }),
      })) {
        if (event.type === "text") {
          stepText += event.text;
          pending += event.text;
          if (!streaming && calls.length === 0 && stepText.length >= preambleBufferChars) {
            streaming = true;
          }
          if (streaming && calls.length === 0) await flush();
        } else {
          calls.push({ toolCallId: event.toolCallId, toolName: event.toolName, input: event.input });
        }
      }

      if (calls.length === 0) await flush();
      return { calls, stepText };
    };

    let outcome: Awaited<ReturnType<typeof runStep>>;
    try {
      outcome = await runStep();
    } catch (error) {
      if (!toolsEnabled || answerText || !isToolsUnsupportedError(error)) throw error;
      console.warn("[agent-runtime] model cannot call tools; continuing without them:", error);
      toolsEnabled = false;
      outcome = await runStep();
    }

    const { calls, stepText } = outcome;

    if (calls.length === 0) {
      if (stepText) messages.push({ role: "assistant", content: stepText });
      return {
        steps: step + 1,
        toolCalls: toolCallCount,
        finishReason: "completed",
        toolsEnabled,
        text: answerText,
        messages,
      };
    }

    messages.push({
      role: "assistant",
      content: [
        ...(stepText ? [{ type: "text" as const, text: stepText }] : []),
        ...calls.map((call) => ({
          type: "tool-call" as const,
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          input: call.input,
        })),
      ],
    });

    toolCallCount += calls.length;
    const results = await Promise.all(
      calls.map(async (call) => {
        try {
          return await options.executeTool(call);
        } catch (error) {
          return `<error>${error instanceof Error ? error.message : String(error)}</error>`;
        }
      }),
    );

    messages.push({
      role: "tool",
      content: calls.map((call, i) => ({
        type: "tool-result" as const,
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        output: { type: "text" as const, value: results[i] },
      })),
    });
  }

  return {
    steps: options.maxSteps,
    toolCalls: toolCallCount,
    finishReason: "max_steps",
    toolsEnabled,
    text: answerText,
    messages,
  };
}
