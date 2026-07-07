/**
 * @fileoverview Unit tests for the article extraction API endpoint
 */
import { GET, POST } from "../route";
import { NextRequest } from "next/server";
import { extractContent } from "extract-webpage/url-to-content/url-to-content";
import { extractArticleViaScraper, extractViaTavily } from "@/lib/scraper";
import { getDB } from "@/lib/database";
import { articleCache, articleQA } from "@/lib/database/schema";

// Mock dependencies
jest.mock("ai-research-agent/extractor/url-to-content/url-to-content", () => ({
  extractContent: jest.fn(),
}));

// Mock the Cloudflare Puppeteer scraper + Tavily fallback so tests never hit
// the network. By default both "fail" (return an error) so the route falls
// through to the in-process extractContent path exercised by most tests.
jest.mock("@/lib/scraper", () => ({
  extractArticleViaScraper: jest.fn(),
  extractViaTavily: jest.fn(),
}));

// getTavilyApiKey is read by the route to pass a key into extractViaTavily.
jest.mock("@/lib/config/serverRegistry", () => ({
  getTavilyApiKey: jest.fn(() => ""),
}));

jest.mock("@/lib/database", () => ({
  getDB: jest.fn(),
}));

const mockExtractContent = extractContent as jest.MockedFunction<
  typeof extractContent
>;
const mockExtractViaScraper = extractArticleViaScraper as jest.MockedFunction<
  typeof extractArticleViaScraper
>;
const mockExtractViaTavily = extractViaTavily as jest.MockedFunction<
  typeof extractViaTavily
>;
const mockGetDB = getDB as jest.MockedFunction<typeof getDB>;

// Mock DB operations
const mockDbSelect = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbInsert = jest.fn();
const mockDbFrom = jest.fn();
const mockDbWhere = jest.fn();
const mockDbLimit = jest.fn();
const mockDbSet = jest.fn();
const mockDbValues = jest.fn();

describe("GET /api/doc/article", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // By default the scraper and Tavily both "fail" so tests exercise the
    // extractContent fallback path. Individual tests override these to test the
    // scraper and Tavily tiers.
    mockExtractViaScraper.mockResolvedValue({
      error: "scraper unavailable in test",
    });
    mockExtractViaTavily.mockResolvedValue({
      error: "tavily unavailable in test",
    });

    // Setup default mock DB chain
    mockDbLimit.mockReturnValue([]);
    mockDbWhere.mockReturnValue({ limit: mockDbLimit });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    mockDbUpdate.mockReturnValue({ set: mockDbSet });
    mockDbValues.mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({ values: mockDbValues });

    mockGetDB.mockReturnValue({
      select: mockDbSelect,
      update: mockDbUpdate,
      insert: mockDbInsert,
    } as any);
  });

  it("should return 400 if url parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/doc/article");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL parameter is required");
  });

  it("should reject malformed URLs", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=invalid url with spaces"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL is not an extractable article");
  });

  it("should reject search engine URLs", async () => {
    const testCases = [
      "https://www.google.com/search?q=test",
      "https://www.bing.com/search?q=test",
      "https://duckduckgo.com/?q=test",
    ];

    for (const url of testCases) {
      const req = new NextRequest(
        `http://localhost:3000/api/doc/article?url=${encodeURIComponent(url)}`
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("URL is not an extractable article");
    }
  });

  it("should return video message for video URLs", async () => {
    const testCases = [
      "https://vimeo.com/123456",
      "https://www.dailymotion.com/video/x123456",
      "https://www.twitch.tv/channel",
    ];

    for (const url of testCases) {
      const req = new NextRequest(
        `http://localhost:3000/api/doc/article?url=${encodeURIComponent(url)}`
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.article.title).toBe("Video Content");
      expect(data.isVideo).toBe(true);
      expect(data.cached).toBe(false);
    }
  });

  it("should return cached article if exists", async () => {
    const cachedArticle = {
      url: "https://example.com/article",
      title: "Cached Article",
      html: "<p>Cached content</p>",
      cite: "Author (2024). Cached Article.",
      author: "John Doe",
      author_cite: "Doe, J.",
      author_short: "Doe",
      author_type: "single",
      date: "2024-01-01",
      source: "Example",
      word_count: 100,
      followUpQuestions: ["Question 1", "Question 2"],
      hitCount: 5,
      lastAccessed: 1234567890,
    };

    const qaHistory = [
      { question: "What is this?", answer: "It's a test article" },
    ];

    mockDbLimit.mockReturnValueOnce([cachedArticle]);
    mockDbFrom.mockReturnValueOnce({ where: mockDbWhere });
    mockDbSelect.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({ where: mockDbWhere }),
    });
    mockDbWhere.mockReturnValueOnce(qaHistory);

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/article"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.article.title).toBe("Cached Article");
    expect(data.article.html).toBe("<p>Cached content</p>");
    expect(data.article.qaHistory).toEqual(qaHistory);
    expect(data.article.followUpQuestions).toEqual([
      "Question 1",
      "Question 2",
    ]);
  });

  it("should extract content if not cached (extractContent fallback)", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    const extractedArticle = {
      url: "https://example.com/new-article",
      title: "New Article",
      html: "<p>Fresh content</p>",
      author: "Jane Smith",
      author_cite: "Smith, J.",
      author_short: "Smith",
      author_type: "single",
      date: "2024-01-15",
      source: "Example News",
      word_count: 250,
    };

    mockExtractContent.mockResolvedValueOnce(extractedArticle);

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/new-article"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.article.title).toBe("New Article");
    expect(data.article.html).toBe("<p>Fresh content</p>");
    expect(data.article.followUpQuestions).toEqual([]);
    expect(data.article.qaHistory).toEqual([]);
    expect(mockExtractContent).toHaveBeenCalledWith(
      "https://example.com/new-article"
    );
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("should extract content via the Cloudflare scraper when available", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    const scrapedArticle = {
      url: "https://example.com/scraped-article",
      title: "Scraped Article",
      html: "<p>Rendered by puppeteer-cloudflare</p>",
      author: "Ada Lovelace",
      author_cite: "Lovelace, A.",
      source: "example.com",
      word_count: 5,
      cite: "Lovelace, A. <b>Scraped Article</b>.",
    };

    mockExtractViaScraper.mockResolvedValueOnce(scrapedArticle);

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/scraped-article"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.article.title).toBe("Scraped Article");
    expect(data.article.html).toBe("<p>Rendered by puppeteer-cloudflare</p>");
    // Scraper produced content, so the direct extractContent fallback is skipped.
    expect(mockExtractViaScraper).toHaveBeenCalledWith(
      "https://example.com/scraped-article"
    );
    expect(mockExtractContent).not.toHaveBeenCalled();
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("should fall back to Tavily when the scraper fails", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    // Scraper fails (default), Tavily succeeds.
    const tavilyArticle = {
      url: "https://apnews.com/article/example",
      title: "AP Article",
      html: "<p>Extracted by Tavily</p>",
      source: "apnews.com",
      word_count: 3,
      via: "tavily",
      cite: "apnews.com. <b>AP Article</b>.",
    };
    mockExtractViaTavily.mockResolvedValueOnce(tavilyArticle);

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://apnews.com/article/example"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.article.title).toBe("AP Article");
    expect(data.article.html).toBe("<p>Extracted by Tavily</p>");
    expect(mockExtractViaScraper).toHaveBeenCalled();
    expect(mockExtractViaTavily).toHaveBeenCalledWith(
      "https://apnews.com/article/example",
      ""
    );
    // Tavily produced content, so the direct extractContent fallback is skipped.
    expect(mockExtractContent).not.toHaveBeenCalled();
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("should handle extraction errors gracefully", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    mockExtractContent.mockRejectedValueOnce(
      new Error("Network error during extraction")
    );

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/error"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Article extraction failed");
    expect(data.detail).toBe("Network error during extraction");
  });

  it("should handle extraction returning no content", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    mockExtractContent.mockResolvedValueOnce({
      error: "Failed to extract content",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/no-content"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Article extraction returned no content");
  });

  it("should handle extraction returning empty html", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    mockExtractContent.mockResolvedValueOnce({
      title: "Empty Article",
      html: "",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/empty"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Article extraction returned no content");
  });

  it("should handle 403 Forbidden errors from extraction", async () => {
    mockDbLimit.mockReturnValueOnce([]); // No cache

    mockExtractContent.mockResolvedValueOnce({
      error: "HTTP error: 403 Forbidden",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://independent.academia.edu/test"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Article extraction returned no content");
    expect(data.detail).toBe("HTTP error: 403 Forbidden");
  });

  it("should update empty cached row with extracted content", async () => {
    const emptyCache = [
      {
        url: "https://example.com/update",
        title: null,
        html: null,
        hitCount: 0,
      },
    ];

    mockDbLimit.mockReturnValueOnce(emptyCache);

    const extractedArticle = {
      url: "https://example.com/update",
      title: "Updated Article",
      html: "<p>Now has content</p>",
      source: "Example",
      word_count: 50,
    };

    mockExtractContent.mockResolvedValueOnce(extractedArticle);

    const req = new NextRequest(
      "http://localhost:3000/api/doc/article?url=https://example.com/update"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.article.title).toBe("Updated Article");
    expect(mockDbUpdate).toHaveBeenCalled();
  });
});

describe("POST /api/doc/article", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDbWhere.mockReturnValue(undefined);
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    mockDbUpdate.mockReturnValue({ set: mockDbSet });
    mockDbValues.mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({ values: mockDbValues });

    mockGetDB.mockReturnValue({
      insert: mockDbInsert,
      update: mockDbUpdate,
    } as any);
  });

  it("should return 400 if url is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/doc/article", {
      method: "POST",
      body: JSON.stringify({ question: "Test", answer: "Answer" }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL is required");
  });

  it("should store Q&A pair", async () => {
    const req = new NextRequest("http://localhost:3000/api/doc/article", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/article",
        question: "What is this about?",
        answer: "It's about testing",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDbInsert).toHaveBeenCalledWith(articleQA);
    expect(mockDbValues).toHaveBeenCalledWith({
      articleUrl: "https://example.com/article",
      question: "What is this about?",
      answer: "It's about testing",
    });
  });

  it("should update follow-up questions", async () => {
    const req = new NextRequest("http://localhost:3000/api/doc/article", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/article",
        followUpQuestions: ["Question 1", "Question 2", "Question 3"],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDbUpdate).toHaveBeenCalledWith(articleCache);
    expect(mockDbSet).toHaveBeenCalledWith({
      followUpQuestions: ["Question 1", "Question 2", "Question 3"],
    });
  });

  it("should handle both Q&A and follow-up questions", async () => {
    const req = new NextRequest("http://localhost:3000/api/doc/article", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/article",
        question: "Test question",
        answer: "Test answer",
        followUpQuestions: ["Follow up 1"],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("should handle POST errors gracefully", async () => {
    mockDbInsert.mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const req = new NextRequest("http://localhost:3000/api/doc/article", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/article",
        question: "Test",
        answer: "Answer",
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to store article data");
  });
});
