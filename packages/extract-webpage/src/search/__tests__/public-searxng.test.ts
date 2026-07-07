/**
 * @fileoverview Unit tests for SearXNG search functionality
 */
import { searchWeb, searchSearxng } from "../public-searxng";
import grab from "../utils/grab";

// Mock grab-url
jest.mock("grab-url");
const mockGrab = grab as jest.MockedFunction<typeof grab>;

describe("searchWeb", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Private SearXNG instance (JSON)", () => {
    it("should search with private SearXNG instance", async () => {
      const mockResults = {
        results: [
          {
            title: "Test Result 1",
            url: "https://example.com/1",
            content: "Test snippet 1",
            score: 0.95,
            metadata: "2024-01-01 | Example News",
          },
          {
            title: "Test Result 2",
            url: "https://example.com/2",
            content: "Test snippet 2",
            score: 0.85,
          },
        ],
        suggestions: ["suggestion1", "suggestion2"],
        infoboxes: [],
      };

      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test query", {
        privateSearxng: "https://search.example.com",
      });

      expect(mockGrab).toHaveBeenCalledWith(
        "https://search.example.com/search",
        expect.objectContaining({
          q: expect.stringContaining("test"),
          format: "json",
        })
      );

      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("suggestions");
      if (!Array.isArray(result)) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].title).toBe("Test Result 1");
        expect(result.results[0].score).toBe(0.95);
      }
    });

    it("should parse metadata for date and source", async () => {
      const mockResults = {
        results: [
          {
            title: "Article with Metadata",
            url: "https://example.com/article",
            content: "Content",
            score: 0.9,
            metadata: "Jan 15, 2024 | TechNews",
          },
        ],
        suggestions: [],
        infoboxes: [],
      };

      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result) && result.results.length > 0) {
        const firstResult = result.results[0];
        expect(firstResult.date).toBeDefined();
        expect(firstResult.source).toBeDefined();
      }
    });

    it("should clean HTML entities from titles", async () => {
      const mockResults = {
        results: [
          {
            title: "Test &amp; Title with &lt;HTML&gt; Entities",
            url: "https://example.com",
            content: "Content",
            score: 0.9,
          },
        ],
        suggestions: [],
        infoboxes: [],
      };

      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result) && result.results.length > 0) {
        expect(result.results[0].title).not.toContain("&amp;");
        expect(result.results[0].title).toContain("&");
        expect(result.results[0].title).not.toContain("&lt;");
      }
    });

    it("should handle breadcrumbed titles", async () => {
      const mockResults = {
        results: [
          {
            title: "Site Name | Very Long Article Title Here",
            url: "https://example.com",
            content: "Content",
            score: 0.9,
          },
        ],
        suggestions: [],
        infoboxes: [],
      };

      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result) && result.results.length > 0) {
        // Should extract the longest part
        expect(result.results[0].title).toContain("Very Long Article Title Here");
      }
    });

    it("should add favicon URLs", async () => {
      const mockResults = {
        results: [
          {
            title: "Test",
            url: "https://example.com/page",
            content: "Content",
            score: 0.9,
          },
        ],
        suggestions: [],
        infoboxes: [],
      };

      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result) && result.results.length > 0) {
        expect(result.results[0].favicon).toContain("googleusercontent.com");
        expect(result.results[0].favicon).toContain("example.com");
      }
    });

    it("should handle string response by parsing JSON", async () => {
      const mockResultsString = JSON.stringify({
        results: [
          {
            title: "Test",
            url: "https://example.com",
            content: "Content",
            score: 0.9,
          },
        ],
        suggestions: [],
        infoboxes: [],
      });

      mockGrab.mockResolvedValueOnce(mockResultsString);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result)) {
        expect(result.results).toHaveLength(1);
      }
    });

    it("should handle invalid JSON gracefully", async () => {
      mockGrab.mockResolvedValueOnce("Not valid JSON");

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      if (!Array.isArray(result)) {
        expect(result.results).toEqual([]);
        expect(result.suggestions).toEqual([]);
      }
    });

    it("should validate URL paths", async () => {
      const mockResults = {
        results: [
          {
            title: "Domain Only",
            url: "https://example.com/", // Just domain
            content: "Content",
            score: 0.9,
          },
          {
            title: "Full Path",
            url: "https://example.com/article/page",
            content: "Content",
            score: 0.8,
          },
        ],
        suggestions: [],
        infoboxes: [],
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockGrab.mockResolvedValueOnce(mockResults);

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("domain-only"),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Public SearXNG instance (HTML scraping)", () => {
    it("should scrape results from HTML", async () => {
      const mockHtml = `
        <article class="result">
          <h3><a href="https://example.com/1">First Result</a></h3>
          <p class="content">First snippet</p>
        </article>
        <article class="result">
          <h3><a href="https://example.com/2">Second Result</a></h3>
          <p class="content">Second snippet</p>
        </article>
      `;

      mockGrab.mockResolvedValueOnce(mockHtml);

      const result = await searchWeb("test", {
        privateSearxng: false,
      });

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe("First Result");
        expect(result[0].url).toBe("https://example.com/1");
        expect(result[0].snippet).toBe("First snippet");
      }
    });

    it("should handle HTML entities in scraped content", async () => {
      const mockHtml = `
        <article class="result">
          <h3><a href="https://example.com?param=value&amp;other=test">Test &amp; Title</a></h3>
          <p class="content">Content with &lt;entities&gt;</p>
        </article>
      `;

      mockGrab.mockResolvedValueOnce(mockHtml);

      const result = await searchWeb("test", {
        privateSearxng: false,
      });

      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].title).toContain("&");
        expect(result[0].title).not.toContain("&amp;");
        expect(result[0].url).toContain("&");
        expect(result[0].snippet).toContain("<entities>");
      }
    });

    it("should add favicons to scraped results", async () => {
      const mockHtml = `
        <article class="result">
          <h3><a href="https://example.com/page">Test</a></h3>
          <p class="content">Content</p>
        </article>
      `;

      mockGrab.mockResolvedValueOnce(mockHtml);

      const result = await searchWeb("test", {
        privateSearxng: false,
      });

      if (Array.isArray(result) && result.length > 0) {
        expect(result[0].favicon).toContain("google.com/s2/favicons");
        expect(result[0].domain).toBe("example.com");
      }
    });

    it("should validate URLs in scraped results", async () => {
      const mockHtml = `
        <article class="result">
          <h3><a href="https://example.com/">Domain Only</a></h3>
          <p class="content">Content</p>
        </article>
      `;

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockGrab.mockResolvedValueOnce(mockHtml);

      await searchWeb("test", { privateSearxng: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("domain-only"),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Retry logic", () => {
    it("should retry on fetch failure", async () => {
      mockGrab
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          results: [
            { title: "Retry Success", url: "https://example.com", content: "Content", score: 0.9 },
          ],
          suggestions: [],
          infoboxes: [],
        });

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        maxRetries: 3,
      });

      expect(mockGrab).toHaveBeenCalledTimes(2);
      if (!Array.isArray(result)) {
        expect(result.results[0].title).toBe("Retry Success");
      }
    });

    it("should retry on empty results", async () => {
      mockGrab
        .mockResolvedValueOnce("") // Empty HTML
        .mockResolvedValueOnce(`
          <article class="result">
            <h3><a href="https://example.com">Retry Result</a></h3>
            <p class="content">Found on retry</p>
          </article>
        `);

      const result = await searchWeb("test", {
        privateSearxng: false,
        maxRetries: 2,
      });

      expect(mockGrab).toHaveBeenCalledTimes(2);
      if (Array.isArray(result)) {
        expect(result[0].title).toBe("Retry Result");
      }
    });

    it("should return empty array after exhausting retries", async () => {
      mockGrab.mockRejectedValue(new Error("Network error"));

      const result = await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        maxRetries: 2,
      });

      expect(mockGrab).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result).toEqual([]);
    });
  });

  describe("Search parameters", () => {
    it("should apply category filter", async () => {
      mockGrab.mockResolvedValueOnce({
        results: [],
        suggestions: [],
        infoboxes: [],
      });

      await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        category: "news",
      });

      expect(mockGrab).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          category_news: 1,
        })
      );
    });

    it("should apply recency filter", async () => {
      mockGrab.mockResolvedValueOnce({
        results: [],
        suggestions: [],
        infoboxes: [],
      });

      await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        recency: "week",
      });

      expect(mockGrab).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          time_range: "week",
        })
      );
    });

    it("should handle pagination", async () => {
      mockGrab.mockResolvedValueOnce({
        results: [],
        suggestions: [],
        infoboxes: [],
      });

      await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        page: 3,
      });

      expect(mockGrab).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          pageno: 3,
        })
      );
    });

    it("should apply safesearch", async () => {
      mockGrab.mockResolvedValueOnce({
        results: [],
        suggestions: [],
        infoboxes: [],
      });

      await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        safesearch: true,
      });

      expect(mockGrab).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          safesearch: "1",
        })
      );
    });

    it("should use custom language", async () => {
      mockGrab.mockResolvedValueOnce({
        results: [],
        suggestions: [],
        infoboxes: [],
      });

      await searchWeb("test", {
        privateSearxng: "https://search.example.com",
        lang: "es",
      });

      expect(mockGrab).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          language: "es",
        })
      );
    });
  });
});

describe("searchSearxng", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should adapt options to searchWeb", async () => {
    mockGrab.mockResolvedValueOnce({
      results: [{ title: "Test", url: "https://example.com", content: "Content", score: 0.9 }],
      suggestions: ["test1"],
      infoboxes: [],
    });

    const result = await searchSearxng("test query", {
      categories: ["news"],
      pageno: 2,
      language: "fr",
    });

    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("suggestions");
    expect(result.results).toHaveLength(1);
    expect(result.suggestions).toHaveLength(1);
  });

  it("should handle array results from searchWeb", async () => {
    mockGrab.mockResolvedValueOnce(`
      <article class="result">
        <h3><a href="https://example.com">Test</a></h3>
        <p class="content">Content</p>
      </article>
    `);

    const result = await searchSearxng("test", { categories: ["general"] });

    expect(result.results).toHaveLength(1);
    expect(result.suggestions).toEqual([]);
  });
});
