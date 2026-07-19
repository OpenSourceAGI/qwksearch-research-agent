import { predictNextWordsWithSmallLocalModel } from "../src/suggest-next-words/autocomplete-ai";
import { describe, it, expect } from "vitest";

describe("predictNextWordsWithSmallLocalModel", () => {
  it("should predict next words to complete the sentence", async () => {
    const samplePrompts = [
      // "ai broker has a lot of potential to",
      // "what can help build ai is that",
      "well-suited for sequence generation and can be",
      "the flagship model is estimated to have",
    ];

    for (const prompt of samplePrompts) {
      const result = await predictNextWordsWithSmallLocalModel(prompt);
      console.log(prompt, "--->", result);

      expect(result).toBeDefined();
    }
  });
});
