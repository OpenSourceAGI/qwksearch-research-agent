import { getModel, preloadModel } from "./modelCache";

/**
 * Options for text generation model configuration
 */
interface PredictNextWordsOptions {
  /**
   * The model identifier to use from Hugging Face
   * @default "Xenova/distilgpt2"
   */
  model?: string;

  /**
   * Maximum number of new tokens to generate
   * @default 16
   */
  maxTokens?: number;

  /**
   * Additional model parameters to pass to the pipeline
   * @default {}
   */
  modelParams?: Record<string, any>;
}

// Re-export preloadModel for convenience
export { preloadModel, getModel } from "./modelCache";

/**
 * Generates the next words for a given prompt using a text generation model.
 *
 * The DistilGPT2 model is a distilled, smaller version of OpenAI's GPT-2, featuring
 * around 82 million parameters (~80MB), and available in Hugging Face Transformers
 * for efficient next word (next-token) prediction tasks in English text. It is
 * well-suited for sequence generation and can be used as a next word prediction
 * model with code similar to GPT2, but offers faster and lighter inference compared
 * GPT-2 (124M parameter) model, preserving most capabilities but running
 * significantly faster and requiring less memory.
 * @see https://huggingface.co/Xenova/distilgpt2
 * @param {string} prompt - The input prompt to complete.
 * @param {PredictNextWordsOptions} [options] - Generation options.
 * @returns {Promise<string>} - The generated text completions.
 */
export async function predictNextWordsWithSmallLocalModel(
  prompt: string,
  {
    model = "Xenova/distilgpt2",
    maxTokens = 16,
    modelParams = {},
  }: PredictNextWordsOptions = {},
): Promise<string> {
  if (!prompt) throw new Error("Prompt is required");

  console.log("[predictNextWords] Starting prediction for prompt:", prompt);

  // Get the cached model (or load it if not cached)
  const pipeline = await getModel({ model });

  console.log("[predictNextWords] Model ready, generating...");

  // Use cached model for prediction
  const result = await pipeline(prompt, {
    max_new_tokens: maxTokens,
    ...modelParams,
  });

  console.log("[predictNextWords] Raw result:", result);

  // Extract generated text from result
  let generatedText = "";
  console.log(JSON.stringify(result));

  if (Array.isArray(result)) {
    // Handle array of results
    generatedText = result
      .map((item: any) => {
        if (
          item &&
          typeof item === "object" &&
          "generated_text" in item &&
          typeof item.generated_text === "string"
        ) {
          console.log(
            "[predictNextWords] Generated text:",
            item.generated_text,
          );
          return item.generated_text;
        }
        return "";
      })
      .join(" ");
  } else if (
    result &&
    typeof result === "object" &&
    "generated_text" in result
  ) {
    // Handle single result object
    const textResult = (result as any).generated_text;
    if (typeof textResult === "string") {
      generatedText = textResult;
      console.log("[predictNextWords] Generated text:", generatedText);
    }
  }

  const completion = generatedText.replace(prompt, "").trim();

  console.log("[predictNextWords] Final completion:", completion);

  return completion;
}
