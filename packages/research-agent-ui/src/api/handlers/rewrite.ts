/**
 * @fileoverview Handler that rewrites user-supplied text for clarity/grammar/style via Groq.
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
 */
import type { RewriteDeps } from "../types";

export function createRewriteHandler(deps: RewriteDeps) {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const { text, prompt: customPrompt, stream } = await req.json();

      if (!text || typeof text !== "string") {
        return Response.json(
          { error: "Text is required and must be a string" },
          { status: 400 },
        );
      }

      const GROQ_API_KEY = deps.getEnv("GROQ_API_KEY");

      if (!GROQ_API_KEY) {
        console.error("GROQ_API_KEY is not configured");
        return Response.json(
          {
            error:
              "AI service is not configured. Please contact the administrator.",
          },
          { status: 500 },
        );
      }

      const model = deps.createGroq({ apiKey: GROQ_API_KEY })(
        "llama-3.3-70b-versatile",
      );

      const prompt =
        customPrompt ||
        `Rewrite the following text to improve clarity, grammar, and style while maintaining the original meaning and tone. Only return the rewritten text without any explanation or additional commentary:

${text}`;

      // Streaming is opt-in on both sides: the caller has to ask for it, and
      // the host has to have wired `streamText`. Without either, fall through
      // to the JSON contract rather than erroring.
      if (stream && deps.streamText) {
        const { textStream } = deps.streamText({ model, prompt, temperature: 0.7 });

        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              for await (const chunk of textStream) {
                controller.enqueue(encoder.encode(chunk));
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
      console.error("AI rewrite error:", error);
      return Response.json(
        { error: "Failed to process AI request. Please try again." },
        { status: 500 },
      );
    }
  };

  return { POST };
}
