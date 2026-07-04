/**
 * @fileoverview Core logic for generating AI language responses using Vercel AI SDK and various LLM providers.
 * Handles prompt interpolation, tool calling, and response formatting.
 */
import { generateText, tool } from "ai";
import { AGENT_PROMPTS } from "./prompt-templates";
import { AGENT_TOOLS } from "../tools/qwksearch-api-tools";
import { LANGUAGE_MODELS, LANGUAGE_PROVIDERS } from "./language-model-registry";
import { createLLMProvider } from "./provider-factory";
import { convertMarkdownToHTMLEscaped } from "../utils/markdown-to-html";
import type {
  AgentPrompt,
  AgentTool,
  GenerateLanguageOptions,
  GenerateLanguageResult,
} from "./generation-types";

export type {
  LLMProviderName,
  GenerateLanguageOptions,
  GenerateLanguageResult,
} from "./generation-types";
export { convertMarkdownToHTMLEscaped } from "../utils/markdown-to-html";

/**
 * ### Generate Language Response
 * Writes a language response that shows human-like understanding of the
 * question and context.
 * - _Requires_: LLM provider, API key, agent name, and context variables.
 * - _Providers_: groq, togetherai, openai, anthropic, xai, google,
 *   perplexity, ollama, cloudflare, nvidia
 * - _Agent Templates_: custom local entries defined in AGENT_PROMPTS.
 * - _How it Works_: Language models predict the most likely next token given
 *   a prompt. They represent words as high-dimensional vectors, use
 *   transformer attention across all prior tokens, and sample from the
 *   resulting probability distribution to produce human-like text.
 *
 * @see [Vercel AI SDK generateText docs](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text)
 * @see [Hugging Face tutorials](https://huggingface.co/learn)
 * @see [Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
 * @see [Building a Transformer with PyTorch](https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch)
 * @see [LLM training example](https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js)
 *
 * @param options - Configuration for the language-model call
 * @returns Resolved response object with `content`, optional `extract`, or `error`
 * @author [Language Model Researchers](https://arc.net/folder/D0472A20-9C20-4D3F-B145-D2865C0A9FEE)
 * @example
 * const response = await generateLanguageResponse({
 *   query: "Explain neural networks",
 *   agent: "question",
 *   provider: "groq",
 *   apiKey: "your-api-key",
 * });
 */
export async function generateLanguageResponse(
  options: GenerateLanguageOptions = {} as GenerateLanguageOptions,
): Promise<GenerateLanguageResult> {
  const {
    apiKey,
    agent = "question",
    temperature = 1,
    html = true,
    applyContextLimit = true,
    ...context
  } = options;

  // Normalise provider to lowercase for consistent switch matching
  const provider = options.provider?.toLowerCase();

  // Resolve model: explicit override \u2192 provider's registered default
  const model =
    options.model ??
    (LANGUAGE_MODELS as Array<{ provider: string; default?: string }>).find(
      (m) => m.provider.toLowerCase() === provider,
    )?.default ??
    "";

  try {
    // \u2500\u2500 1. Validate required inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const validProviders = LANGUAGE_PROVIDERS as string[];
    if (!apiKey || !provider || !validProviders.includes(provider)) {
      return {
        error:
          "API key and provider are required. Valid providers: " +
          validProviders.join(", "),
      };
    }

    // \u2500\u2500 2. Load agent prompt from local registry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const agentObject = (AGENT_PROMPTS as AgentPrompt[]).find(
      (p) => p?.name === agent,
    );

    if (!agentObject) return { error: `Agent "${agent}" not found` };

    // \u2500\u2500 3. Pre-process the prompt template via optional `before` hook \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    if (agentObject.before) {
      agentObject.prompt = agentObject.before(agentObject.prompt, options);
    }

    // \u2500\u2500 4. Build template variable map and interpolate placeholders \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const templateVars: Record<string, unknown> = {
      ...options,
      input: `${context.query ?? ""} ${context.article ?? ""}`,
    };
    let prompt = interpolateTemplate(agentObject.template ?? "", templateVars);

    // \u2500\u2500 5. Trim prompt to the model's context window \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    if (applyContextLimit) {
      const modelConfig = (
        LANGUAGE_MODELS as Array<{
          provider: string;
          models: Array<{ id: string; contextLength: number }>;
        }>
      )
        .find((m) => m.provider.toLowerCase() === provider)
        ?.models.find((m) => m.id === model);

      if (modelConfig) {
        prompt = prompt.slice(0, modelConfig.contextLength);
      }
    }

    // \u2500\u2500 6. Instantiate the LLM provider \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const llm = createLLMProvider(provider, apiKey, model, temperature);
    if (!llm) return { error: "Invalid provider selected" };

    // \u2500\u2500 7. Resolve tools declared by the agent \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const agentToolDefs = (AGENT_TOOLS as AgentTool[]).filter((t) =>
      agentObject.tools?.includes(t.name),
    );
    const tools =
      agentToolDefs.length > 0
        ? Object.fromEntries(
            agentToolDefs.map((t) => [
              t.name,
              tool({
                description: t.description as string,
                parameters: t.schema as any,
                execute: t.func as (args: any) => Promise<string>,
              }),
            ]),
          )
        : undefined;

    // \u2500\u2500 8. Invoke LLM via Vercel AI SDK generateText \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const { text: rawReply } = await generateText({
      model: llm,
      prompt,
      temperature,
      ...(tools && { tools, maxSteps: 10 }),
    });

    // \u2500\u2500 9. Format output (HTML or raw Markdown) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const content: string = html
      ? await convertMarkdownToHTMLEscaped(rawReply)
      : rawReply;

    // \u2500\u2500 10. Extract structured data via optional `after` hook \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const extract = agentObject.after?.(rawReply, options);

    return { content, ...(extract !== undefined && { extract }) };
  } catch (err) {
    const error = err as { response?: { status?: number }; message?: string };
    return {
      error:
        error.response?.status === 429
          ? "Rate limit exceeded. Please wait before trying again."
          : (error.message ??
            "Failed to generate response. Please try again later."),
    };
  }
}

/**
 * Substitutes `{variableName}` placeholders in a template string with values
 * from `vars`. Object/array values are pretty-printed without braces or
 * commas. Unmatched keys fall back to `"[not provided]"`.
 *
 * @param template - Template string containing `{key}` placeholders
 * @param vars     - Map of variable names to their replacement values
 * @returns The fully interpolated string
 */
function interpolateTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  return template.replace(/\{(.+?)\}/g, (_match, key: string) => {
    if (!(key in vars)) return "[not provided]";
    const value = vars[key];
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2)
      .replace(/[{}"]/g, "")
      .replace(/,/g, "\n");
  });
}
