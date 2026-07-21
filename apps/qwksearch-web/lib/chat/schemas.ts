import { z } from "zod";
import { ModelWithProvider } from "chat-agent-toolkit/models/types";

/**
 * Default query used when a user attaches a file (or files) but sends no
 * message text. The uploaded content is placed in the answer context, so the
 * model is instructed to analyse it directly.
 */
export const DEFAULT_UPLOAD_ANALYSIS_PROMPT =
  "Analyze the uploaded file(s) and summarize the key points.";

/**
 * Schema for a single chat message sent by the client.
 *
 * @property {string} messageId  - Client-generated unique identifier for the message.
 * @property {string} chatId     - Identifier of the chat session this message belongs to.
 * @property {string} content    - The user's message text.
 */
export const messageSchema = z.object({
  /** Client-generated unique identifier for the message. */
  messageId: z.string().min(1, "Message ID is required"),
  /** Identifier of the chat session this message belongs to. */
  chatId: z.string().min(1, "Chat ID is required"),
  /**
   * The user's message text. May be empty when files are attached — in that
   * case the request is treated as "analyse the uploaded file(s)". The
   * body-level refinement enforces that a request has either text or files.
   */
  content: z.string().default(""),
});

/**
 * Resolves the effective query to send to the search pipeline and the LLM.
 *
 * When the user typed a message, that message is used verbatim. When the
 * message is blank but files are attached, a default analysis prompt is
 * substituted so the model has an explicit instruction to work with the
 * uploaded content. Returns `null` when there is neither text nor a file,
 * signalling the caller to reject the request.
 *
 * @param content - The raw message text from the client (may be empty).
 * @param files   - Attached file identifiers.
 * @returns The query to use, or `null` when the request has nothing to act on.
 */
export const resolveMessageContent = (
  content: string,
  files: readonly string[] | undefined,
): string | null => {
  const trimmed = (content ?? "").trim();
  if (trimmed.length > 0) return content;
  if (files && files.length > 0) return DEFAULT_UPLOAD_ANALYSIS_PROMPT;
  return null;
};

/**
 * Schema for the chat model selection sent by the client.
 * Identifies which AI provider and model key to use for the response.
 *
 * @property {string} providerId - The provider identifier (e.g. "openai", "anthropic").
 * @property {string} key        - The specific model key within that provider.
 */
export const chatModelSchema: z.ZodType<ModelWithProvider> = z.object({
  /** The provider identifier (e.g. "openai", "anthropic"). */
  providerId: z.string({ message: "Chat model provider id must be provided" }),
  /** The specific model key within that provider (e.g. "gpt-4o"). */
  key: z.string({ message: "Chat model key must be provided" }),
});

/**
 * Full request body schema for the `POST /api/agent/chat` endpoint.
 *
 * @property {Message}   message                  - The user's chat message.
 * @property {string}    optimizationMode         - Controls speed/quality trade-off: "speed", "balanced", or "quality".
 * @property {string}    focusMode                - The search focus mode key (e.g. "webSearch", "academicSearch").
 * @property {string}    [category="general"]     - Optional search category filter.
 * @property {[string,string][]} [history=[]]     - Prior conversation turns as `[role, content]` tuples.
 * @property {string[]}  [files=[]]               - Attached file identifiers for context.
 * @property {ModelWithProvider} chatModel         - Selected AI model and provider.
 * @property {boolean}   [sourceExtractionEnabled=false] - Whether to extract and return source content.
 * @property {string|null} [systemInstructions=""]  - Custom system instructions to prepend to the prompt.
 */
export const bodySchema = z.object({
  /** The user's chat message. */
  message: messageSchema,
  /** Controls speed/quality trade-off for the response. */
  optimizationMode: z.enum(["speed", "balanced", "quality"], {
    message: "Optimization mode must be one of: speed, balanced, quality",
  }),
  /** The search focus mode key (e.g. "webSearch", "academicSearch"). */
  focusMode: z.string().min(1, "Focus mode is required"),
  /** Optional search category filter. Defaults to "general". */
  category: z.string().optional().default("general"),
  /**
   * Prior conversation turns as `[role, content]` tuples.
   * Role is "human" or "assistant".
   */
  history: z
    .array(
      z.tuple([z.string(), z.string()], {
        message: "History items must be tuples of two strings",
      }),
    )
    .optional()
    .default([]),
  /** Attached file identifiers for context. */
  files: z.array(z.string()).optional().default([]),
  /** Selected AI model and provider. */
  chatModel: chatModelSchema,
  /** Whether to extract and return source content alongside results. */
  sourceExtractionEnabled: z.boolean().optional().default(false),
  /** Custom system instructions to prepend to the prompt. */
  systemInstructions: z.string().nullable().optional().default(""),
  /**
   * Max seconds to spend extracting source content.
   * 0 = unlimited (uses server default); >0 = budget spread across top 3 sources.
   */
  thinkingTimeLimit: z.number().int().min(0).optional().default(5),
}).superRefine((data, ctx) => {
  // A request must carry something to act on: either message text or at least
  // one attached file. A blank message with files is valid — it means
  // "analyse the uploaded file(s)".
  const hasText = data.message.content.trim().length > 0;
  const hasFiles = Array.isArray(data.files) && data.files.length > 0;
  if (!hasText && !hasFiles) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["message", "content"],
      message: "Provide a message or attach a file",
    });
  }
});

/**
 * Inferred TypeScript type for a validated chat message.
 * Derived from {@link messageSchema}.
 */
export type Message = z.infer<typeof messageSchema>;

/**
 * Inferred TypeScript type for the full validated request body.
 * Derived from {@link bodySchema}.
 */
export type Body = z.infer<typeof bodySchema>;

/**
 * Represents a single field-level validation error returned when
 * the request body fails Zod parsing.
 *
 * @property {string} path    - Dot-separated path to the invalid field (e.g. "message.content").
 * @property {string} message - Human-readable description of the validation failure.
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Safely validates a raw request body against {@link bodySchema}.
 *
 * Unlike `bodySchema.parse()`, this does **not** throw on failure.
 * Instead it returns a discriminated union indicating success or failure.
 *
 * @param   {unknown} data - The raw, untyped request body to validate.
 * @returns {{ success: true; data: Body } | { success: false; error: ValidationError[] }}
 *          On success, `data` contains the parsed and defaulted body.
 *          On failure, `error` contains one entry per invalid field.
 *
 * @example
 * ```ts
 * const result = safeValidateBody(await req.json());
 * if (!result.success) {
 *   return Response.json({ error: result.error }, { status: 400 });
 * }
 * const body = result.data;
 * ```
 */
export const safeValidateBody = (
  data: unknown,
) => {
  const result = bodySchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
};
