/**
 * @fileoverview Unit tests for the search API endpoint
 */
import { GET } from "../route";
import { NextRequest } from "next/server";
import { searchWeb } from "ai-research-agent/search/public-searxng";

// Mock the searchWeb function
jest.mock("ai-research-agent/search/public-searxng", () => ({
  searchWeb: jest.fn(),
}));

const mockSearchWeb = searchWeb as jest.MockedFunction<typeof searchWeb>;

describe("GET /api/agent/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if query parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/search");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Query parameter is required");
  });

  it("should return results from searchWeb in array format", async () => {
    const mockResults = [
      {
        title: "Test Result 1",
        url: "https://example.com/1",
        snippet: "Test snippet 1",
        domain: "example.com",
      },
      {
        title: "Test Result 2",
        url: "https://example.com/2",
        snippet: "Test snippet 2",
        domain: "example.com",
      },
    ];

    mockSearchWeb.mockResolvedValueOnce(mockResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test+query&page=1"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual(mockResults);
    expect(data.elapsedTime).toBeDefined();
    expect(mockSearchWeb).toHaveBeenCalledWith("test query", {
      category: "general",
      recency: undefined,
      safesearch: false,
      maxRetries: 6,
      privateSearxng: "https://search.qwksearch.com",
      proxy: "",
      lang: "en-US",
      page: 1,
    });
  });

  it("should return results from searchWeb in object format", async () => {
    const mockResults = {
      results: [
        {
          title: "Test Result 1",
          url: "https://example.com/1",
          snippet: "Test snippet 1",
        },
      ],
      suggestions: ["suggestion1", "suggestion2"],
      infoboxes: [],
    };

    mockSearchWeb.mockResolvedValueOnce(mockResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test&cat=news"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual(mockResults.results);
    expect(data.suggestions).toEqual(mockResults.suggestions);
    expect(data.elapsedTime).toBeDefined();
  });

  it("should handle empty results by retrying with public instances", async () => {
    const mockEmptyResults = { results: [], suggestions: [], infoboxes: [] };
    const mockRetryResults = {
      results: [
        {
          title: "Retry Result",
          url: "https://example.com/retry",
          snippet: "Found on retry",
        },
      ],
      suggestions: [],
      infoboxes: [],
    };

    // First call returns empty, second call returns results
    mockSearchWeb
      .mockResolvedValueOnce(mockEmptyResults)
      .mockResolvedValueOnce(mockRetryResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=obscure+query"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual(mockRetryResults.results);
    expect(mockSearchWeb).toHaveBeenCalledTimes(2);
    // Second call should have privateSearxng: false
    expect(mockSearchWeb.mock.calls[1][1]).toMatchObject({
      privateSearxng: false,
    });
  });

  it("should handle empty array results by retrying", async () => {
    const mockRetryResults = [
      {
        title: "Result from retry",
        url: "https://example.com/retry",
        snippet: "Retry succeeded",
      },
    ];

    // First call returns empty array, second returns results
    mockSearchWeb
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockRetryResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual(mockRetryResults);
    expect(mockSearchWeb).toHaveBeenCalledTimes(2);
  });

  it("should handle search errors gracefully", async () => {
    mockSearchWeb.mockRejectedValueOnce(new Error("Network error"));

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test"
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Search failed");
    expect(data.results).toEqual([]);
  });

  it("should use custom parameters from query string", async () => {
    const mockResults = {
      results: [{ title: "News Result", url: "https://news.example.com" }],
      suggestions: [],
      infoboxes: [],
    };

    mockSearchWeb.mockResolvedValueOnce(mockResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=breaking+news&cat=news&page=2&lang=es&safesearch=true&recency=day"
    );
    await GET(req);

    expect(mockSearchWeb).toHaveBeenCalledWith("breaking news", {
      category: "news",
      recency: "day",
      safesearch: true,
      maxRetries: 6,
      privateSearxng: "https://search.qwksearch.com",
      proxy: "",
      lang: "es",
      page: 2,
    });
  });

  it("should handle publicInstances parameter", async () => {
    const mockResults = [
      { title: "Public Result", url: "https://example.com" },
    ];

    mockSearchWeb.mockResolvedValueOnce(mockResults);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test&publicInstances=true"
    );
    await GET(req);

    expect(mockSearchWeb).toHaveBeenCalledWith("test", {
      category: "general",
      recency: undefined,
      safesearch: false,
      maxRetries: 6,
      privateSearxng: false,
      proxy: "",
      lang: "en-US",
      page: 1,
    });
  });

  it("should handle undefined results from searchWeb", async () => {
    // @ts-ignore - Testing edge case where searchWeb returns undefined
    mockSearchWeb.mockResolvedValueOnce(undefined);

    const req = new NextRequest(
      "http://localhost:3000/api/agent/search?q=test"
    );
    const response = await GET(req);
    const data = await response.json();

    // Should retry with public instances since undefined is falsy
    expect(mockSearchWeb).toHaveBeenCalledTimes(2);
  });
});
