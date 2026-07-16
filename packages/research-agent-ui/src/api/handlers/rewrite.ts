import type { RewriteDeps } from "../types";

export function createRewriteHandler(deps: RewriteDeps) {
  const POST = async (req: Request): Promise<Response> => {
    try {
      const { text, prompt: customPrompt } = await req.json();

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
