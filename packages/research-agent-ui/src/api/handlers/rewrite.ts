/**
 * @fileoverview Handler that rewrites user-supplied text for clarity/grammar/style.
 *
 * Answers in one of two shapes, chosen by the request:
 *
 *   - `{ rewrittenText }` JSON by default — the original contract, and what
 *     every existing caller reads.
 *   - a `text/plain` stream when the body sets `stream: true` and the host
 *     wired `deps.streamText`. This is what the Reason Editor's writing
 *     assistant asks for, so its review panel fills in as the model writes
 *     instead of jumping from a spinner to a finished answer.
 *
 * Both run the same prompt against the same model; only the transport differs.
 *
 * Two things here exist because of a live 500 on `/api/agent/rewrite`, which
 * the logs could only describe as "500, 70ms":
 *
 *   - The model is no longer *only* the deployment's Groq key. A host that
 *     configured some other provider — or a signed-in user who brought their
 *     own — now gets a rewrite instead of a 500 nobody could act on.
 *   - A failure says what failed. The catch-all used to answer "Please try
 *     again" whatever went wrong, and the streaming path committed to a 200
 *     before the model had produced a single token, so a rejected key or a
 *     retired model reached the editor as an empty panel.
 */
import type { RewriteChatModel, RewriteDeps } from "../types";

/** The model the Groq path has always used. Kept as the default on purpose. */
const GROQ_MODEL = "llama-3.3-70b-versatile";

/** An error's message, whatever shape it was thrown in. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : String(error);
}

/**
 * Picks the model to rewrite with, preferring the most specific source.
 *
 * 1. The provider/model the caller named — their own key, chosen in Settings.
 * 2. The deployment's `GROQ_API_KEY`, which is what every existing install has.
 * 3. Whatever provider the host registry does have, so a deployment without a
 *    Groq key still serves the route.
 *
 * Throws with every reason it collected when none of them produce a model; the
 * caller turns that into the response body.
 */
async function resolveModel(
  deps: RewriteDeps,
  chatModel: RewriteChatModel | undefined,
): Promise<unknown> {
  const reasons: string[] = [];

  if (chatModel && deps.loadChatModel) {
    try {
      return await deps.loadChatModel(chatModel);
    } catch (error) {
      // Not fatal: the caller's pick may be stale, and the host may still have
      // a key of its own. Record why and fall through.
      reasons.push(describeError(error));
    }
  }

  const groqApiKey = deps.getEnv("GROQ_API_KEY");
  if (groqApiKey) return deps.createGroq({ apiKey: groqApiKey })(GROQ_MODEL);

  if (deps.loadChatModel) {
    try {
      return await deps.loadChatModel();
    } catch (error) {
      reasons.push(describeError(error));
    }
  }

  throw new Error(
    reasons.length
      ? `AI service is not configured: ${reasons.join("; ")}`
      : "AI service is not configured. Please contact the administrator.",
  );
}

export function createRewriteHandler(deps: RewriteDeps) {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const {
        text,
        prompt: customPrompt,
        stream,
        chatModel,
      } = await req.json();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Text is required and must be a string" },
          { status: 400 },
        );
      }

      let model: unknown;
      try {
        model = await resolveModel(deps, chatModel);
      } catch (error) {
        const message = describeError(error);
        console.error("AI rewrite has no usable model:", message);
        return Response.json({ error: message }, { status: 500 });
      }

      const prompt =
        customPrompt ||
        `Rewrite the following text to improve clarity, grammar, and style while maintaining the original meaning and tone. Only return the rewritten text without any explanation or additional commentary:

${text}`;

      // Streaming is opt-in on both sides: the caller has to ask for it, and
      // the host has to have wired `streamText`. Without either, fall through
      // to the JSON contract rather than erroring.
      if (stream && deps.streamText) {
        const { textStream } = deps.streamText({ model, prompt, temperature: 0.7 });
        const chunks = textStream[Symbol.asyncIterator]();

        // Pull the first chunk *before* answering. Everything that rejects a
        // request outright — a bad key, a retired model, a rate limit — does so
        // here, while a status line can still carry it. Without this the reply
        // is already a 200 and the only signal left is a body that ends early.
        const first = await chunks.next();

        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              if (!first.done) controller.enqueue(encoder.encode(first.value));
              while (true) {
                const chunk = await chunks.next();
                if (chunk.done) break;
                controller.enqueue(encoder.encode(chunk.value));
              }
              controller.close();
            } catch (error) {
              // The status line is long gone by the time a mid-stream failure
              // happens, so the only signal left is ending the body early; the
              // client keeps whatever already arrived.
              console.error("AI rewrite stream error:", error);
              controller.error(error);
            }
          },
        });

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            // Chunks are useless to the editor if a proxy buffers the whole
            // body before forwarding it.
            "X-Accel-Buffering": "no",
          },
        });
      }

      const response = await deps.generateText({ model, prompt, temperature: 0.7 });
      const rewrittenText = response.text.trim();

      return Response.json({ rewrittenText });
    } catch (error) {
      const message = describeError(error);
      console.error("AI rewrite error:", error);
      return Response.json(
        {
          // The reason travels in `error` because that is the field the
          // editor's completion client shows. "Please try again" told a user
          // staring at a failing panel nothing, and told whoever read the
          // Worker log even less.
          error: `Failed to process AI request: ${message}`,
          details: message,
        },
        { status: 500 },
      );
    }
  };

  return { POST };
}
