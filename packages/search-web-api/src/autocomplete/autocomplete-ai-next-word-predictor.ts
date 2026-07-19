/**
 * Autocomplete AI Next-Word Predictor — Local, CPU-based next-word prediction
 * using the Xenova/distilgpt2 model via the Hugging Face Transformers.js library.
 * DistilGPT-2 is a distilled 82 M-parameter variant of GPT-2 (~80 MB) that
 * runs efficiently on CPU with FP16 precision and is well-suited for lightweight
 * inline query completion without any network calls.
 *
 * @see https://huggingface.co/Xenova/distilgpt2
 */

import { pipeline, type TextGenerationSingle } from "@huggingface/transformers";

/**
 * Predict the next words for a given text prompt using a small local language model.
 *
 * @param prompt - The input text to continue.
 * @param options.maxTokens - Maximum number of new tokens to generate (default 16).
 * @param options.model - Hugging Face model ID to use (default `"Xenova/distilgpt2"`).
 * @param options.modelParams - Additional pipeline constructor options.
 * @returns The generated continuation text with the original prompt removed.
 */
export async function predictNextWordsWithSmallLocalModel(
  prompt: string,
  {
    model = "Xenova/distilgpt2",
    maxTokens = 16,
    modelParams = {},
  }: {
    model?: string;
    maxTokens?: number;
    modelParams?: Record<string, unknown>;
  } = {},
): Promise<string> {
  if (!prompt) throw new Error("Prompt is required");

  const generator = await pipeline("text-generation", model, {
    dtype: "fp16",
    device: "cpu",
    ...modelParams,
  });

  return (await generator(prompt, { max_new_tokens: maxTokens }))
    .map((res) => (res as TextGenerationSingle).generated_text)
    .join(" ")
    .replace(prompt, "")
    .trim();
}
