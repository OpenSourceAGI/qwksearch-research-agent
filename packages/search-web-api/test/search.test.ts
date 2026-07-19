import { describe, it, expect } from "vitest";
import { Search } from "../src/search";
import { validateEngineResults } from "./test-utils";

describe("Search Class", () => {
  const search = new Search();

  it("should search across all engines by default", async () => {
    const results = await search.search("javascript", 1);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(validateEngineResults(results)).toBe(true);
  }, 60000);

  it("should filter by engine name", async () => {
    const results = await search.search("react", 1, ["github"]);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      results.forEach((result) => {
        expect(result.engine).toBe("github");
      });
    }
  }, 30000);

  it("should filter by category", async () => {
    const results = await search.search("ubuntu", 1, undefined, ["torrent"]);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      const torrentEngines = ["1337x", "thepiratebay", "nyaa", "yts", "eztv"];
      results.forEach((result) => {
        expect(torrentEngines).toContain(result.engine);
      });
    }
  }, 60000);

  it("should handle pagination", async () => {
    const page1 = await search.search("python", 1, ["google"]);
    const page2 = await search.search("python", 2, ["google"]);

    expect(page1).toBeDefined();
    expect(page2).toBeDefined();
    expect(Array.isArray(page1)).toBe(true);
    expect(Array.isArray(page2)).toBe(true);
  }, 60000);

  it("should handle multiple engine filters", async () => {
    const results = await search.search("nodejs", 1, [
      "github",
      "npm",
      "stackoverflow",
    ]);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      results.forEach((result) => {
        expect(["github", "npm", "stackoverflow"]).toContain(result.engine);
      });
    }
  }, 60000);
});
