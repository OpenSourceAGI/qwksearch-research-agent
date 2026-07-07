import { pipeline, type TextGenerationSingle } from "@huggingface/transformers";

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
 * @param {Object} [options] - Generation options.
 * @param {number} [options.maxTokens=16] - Maximum number of new tokens to generate.
 * @param {string} [options.model='Xenova/distilgpt2'] - The model identifier to use.
 * @returns {Promise<string>} - The generated text completions.
 */
export async function predictNextWordsWithSmallLocalModel(
  prompt: string,
  { model = "Xenova/distilgpt2", maxTokens = 16, modelParams = {} } = {}
): Promise<string> {
  if (!prompt) throw new Error("Prompt is required");
  return (
    await (
      await pipeline("text-generation", model, {
        dtype: "fp16",
        device: "cpu",
        ...modelParams,
      })
    )(prompt, { max_new_tokens: maxTokens })
  )
    .map((res) => (res as TextGenerationSingle).generated_text)
    .join(" ")
    .replace(prompt, "")
    .trim();
}
