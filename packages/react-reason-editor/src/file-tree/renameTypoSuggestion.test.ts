import { describe, expect, it } from "vitest";
import { getRenameTypoSuggestion } from "./renameTypoSuggestion";

describe("getRenameTypoSuggestion", () => {
  it("suggests a correction for a title with a known typo", () => {
    expect(getRenameTypoSuggestion("Recieve Notes")).toBe("Receive Notes");
  });

  it("returns null when the title has no typos", () => {
    expect(getRenameTypoSuggestion("Quarterly Report")).toBeNull();
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(getRenameTypoSuggestion("")).toBeNull();
    expect(getRenameTypoSuggestion("   ")).toBeNull();
  });

  it("trims surrounding whitespace before comparing, but not before returning", () => {
    // The corrected title should itself be trimmed, since a rename input shouldn't
    // commit stray leading/trailing whitespace just because a typo was also fixed.
    expect(getRenameTypoSuggestion("  Recieve Notes  ")).toBe("Receive Notes");
  });

  it("does not suggest model identifiers or code-like tokens", () => {
    expect(getRenameTypoSuggestion("gpt-4 notes")).toBeNull();
  });
});
