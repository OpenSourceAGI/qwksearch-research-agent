import { describe, expect, it } from "vitest";
import { correctTypos } from "./typo-correction";

describe("correctTypos", () => {
  it("corrects a known single-word typo", () => {
    const result = correctTypos("this is definately true");
    expect(result.hasCorrection).toBe(true);
    expect(result.corrected).toBe("this is definitely true");
    expect(result.corrections).toEqual([{ original: "definately", corrected: "definitely" }]);
  });

  it("returns the input unchanged when there are no typos", () => {
    const result = correctTypos("the quick brown fox jumps over the lazy dog");
    expect(result.hasCorrection).toBe(false);
    expect(result.corrected).toBe("the quick brown fox jumps over the lazy dog");
    expect(result.corrections).toEqual([]);
  });

  it("handles empty input", () => {
    const result = correctTypos("");
    expect(result).toEqual({ corrected: "", hasCorrection: false, corrections: [] });
  });

  it("preserves the casing of the original word", () => {
    expect(correctTypos("Definately.").corrected).toBe("Definitely.");
    expect(correctTypos("DEFINATELY").corrected).toBe("DEFINITELY");
  });

  it("does not touch URLs or words containing digits", () => {
    const result = correctTypos("see https://recieve.example.com/definately and gpt-4 recieve");
    expect(result.corrected).toBe("see https://recieve.example.com/definately and gpt-4 receive");
    expect(result.corrections).toEqual([{ original: "recieve", corrected: "receive" }]);
  });
});
