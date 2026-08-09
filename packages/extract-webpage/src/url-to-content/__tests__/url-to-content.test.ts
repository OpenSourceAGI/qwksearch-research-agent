/**
 * @fileoverview Unit tests for URL content extraction
 */
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { extractContent } from "../url-to-content";
import { scrapeURL } from "../url-to-html";
import { extractContentAndCite } from "../../html-to-content/html-to-content";
import { convertYoutubeToText, getURLYoutubeVideo } from "../youtube-helpers";
import grab from "../../utils/grab";
import { convertPDFToHTML } from "extract-pdf";

// Mock dependencies
vi.mock("../url-to-html", () => ({
  scrapeURL: vi.fn(),
}));

vi.mock("../../html-to-content/html-to-content", () => ({
  extractContentAndCite: vi.fn(),
}));

vi.mock("../youtube-helpers", () => ({
  getURLYoutubeVideo: vi.fn(),
  convertYoutubeToText: vi.fn(),
}));

vi.mock("extract-pdf", () => ({
  convertPDFToHTML: vi.fn(),
}));

vi.mock("../../utils/grab");

const mockScrapeURL = scrapeURL as MockedFunction<typeof scrapeURL>;
const mockExtractContentAndCite = extractContentAndCite as MockedFunction<
  typeof extractContentAndCite
>;
const mockConvertYoutubeToText =
  convertYoutubeToText as MockedFunction<typeof convertYoutubeToText>;
const mockConvertPDFToHTML = convertPDFToHTML as MockedFunction<
  typeof convertPDFToHTML
>;
const mockGetURLYoutubeVideo =
  getURLYoutubeVideo as MockedFunction<typeof getURLYoutubeVideo>;
const mockGrab = grab as MockedFunction<typeof grab>;

describe("extractContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("URL extraction", () => {
    it("should extract content from a regular URL", async () => {
      const mockHtml = "<html><body><article>Test content</article></body></html>";
      const mockExtracted = {
        title: "Test Article",
        html: "<p>Test content</p>",
        author: "John Doe",
        date: "2024-01-01",
        source: "Example",
        word_count: 2,
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      const result = await extractContent("https://example.com/article");

      expect(mockScrapeURL).toHaveBeenCalledWith("https://example.com/article", {
        proxy: null,
      });
      expect(mockExtractContentAndCite).toHaveBeenCalledWith(
        mockHtml,
        expect.objectContaining({ url: "https://example.com/article" })
      );
      expect(result.title).toBe("Test Article");
      expect(result.html).toBe("<p>Test content</p>");
    });

    it("should handle scrapeURL returning error object", async () => {
      mockScrapeURL.mockResolvedValueOnce({
        error: "HTTP error: 403 Forbidden",
      } as any);

      const result = await extractContent("https://blocked-site.com/article");

      // Any non-string scrapeURL result collapses to one generic message.
      expect(result.error).toBe("Failed to fetch HTML content");
      expect(mockExtractContentAndCite).not.toHaveBeenCalled();
    });

    it("should handle scrapeURL returning null", async () => {
      mockScrapeURL.mockResolvedValueOnce(null as any);

      const result = await extractContent("https://null-response.com/article");

      expect(result.error).toBe("Failed to fetch HTML content");
      expect(mockExtractContentAndCite).not.toHaveBeenCalled();
    });

    it("should handle scrapeURL returning undefined", async () => {
      mockScrapeURL.mockResolvedValueOnce(undefined as any);

      const result = await extractContent(
        "https://undefined-response.com/article"
      );

      expect(result.error).toBe("Failed to fetch HTML content");
      expect(mockExtractContentAndCite).not.toHaveBeenCalled();
    });

    it("should handle scrapeURL returning empty string", async () => {
      mockScrapeURL.mockResolvedValueOnce("");

      const result = await extractContent("https://empty-response.com/article");

      expect(result.error).toBe("Failed to fetch HTML content");
      expect(mockExtractContentAndCite).not.toHaveBeenCalled();
    });

    it("should handle scrapeURL throwing an error", async () => {
      mockScrapeURL.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await extractContent("https://timeout.com/article");

      // extractContent catches scrape failures and reports them in-band.
      expect(result.error).toBe("Failed to scrape URL: Network timeout");
    });

    it("should handle extraction returning no HTML", async () => {
      const mockHtml = "<html><body>Content</body></html>";
      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce({
        title: "Article",
        html: "", // Empty HTML
      } as any);

      const result = await extractContent("https://example.com/empty");

      expect(result.error).toBeUndefined(); // This is actually a success case with empty content
    });

    it("should extract from raw HTML string", async () => {
      const mockHtml = "<html><body><p>Test content</p></body></html>";
      const mockExtracted = {
        title: "Test",
        html: "<p>Test content</p>",
        word_count: 2,
      };

      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      const result = await extractContent(mockHtml, { url: "https://example.com" });

      expect(mockScrapeURL).not.toHaveBeenCalled();
      expect(mockExtractContentAndCite).toHaveBeenCalledWith(mockHtml, expect.any(Object));
      expect(result.title).toBe("Test");
    });

    it("should handle extraction with custom options", async () => {
      const mockHtml = "<html><body>Content</body></html>";
      const mockExtracted = {
        title: "Test",
        html: "<p>Content</p>",
        word_count: 1,
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      await extractContent("https://example.com/article", {
        images: false,
        links: false,
        formatting: false,
        timeout: 15,
        proxy: "https://proxy.example.com",
      });

      expect(mockScrapeURL).toHaveBeenCalledWith("https://example.com/article", {
        proxy: "https://proxy.example.com",
      });
      expect(mockExtractContentAndCite).toHaveBeenCalledWith(
        mockHtml,
        expect.objectContaining({
          images: false,
          links: false,
          formatting: false,
          timeout: 15,
          proxy: "https://proxy.example.com",
        })
      );
    });
  });

  describe("YouTube extraction", () => {
    it("should extract YouTube video transcript", async () => {
      mockGetURLYoutubeVideo.mockReturnValueOnce("dQw4w9WgXcQ");

      const mockTranscript = {
        title: "Test Video",
        html: "<p>Transcript content</p>",
        source: "YouTube",
        word_count: 2,
      };

      mockConvertYoutubeToText.mockResolvedValueOnce(mockTranscript);

      const result = await extractContent(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );

      expect(mockConvertYoutubeToText).toHaveBeenCalledWith(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        expect.any(Object)
      );
      expect(result.title).toBe("Test Video");
      expect(result.source).toBe("YouTube");
      expect(mockScrapeURL).not.toHaveBeenCalled();
    });
  });

  describe("PDF extraction", () => {
    it("should extract content from PDF URLs", async () => {
      const mockPdfContent = {
        title: "PDF Document",
        html: "<p>PDF content</p>",
        word_count: 2,
      };

      mockConvertPDFToHTML.mockResolvedValueOnce(mockPdfContent as any);

      const result = await extractContent("https://example.com/document.pdf");

      expect(mockConvertPDFToHTML).toHaveBeenCalledWith(
        "https://example.com/document.pdf",
        expect.any(Object)
      );
      expect(result.title).toBe("PDF Document");
      expect(mockScrapeURL).not.toHaveBeenCalled();
    });
  });

  describe("Google Docs extraction", () => {
    it("should rewrite Google Doc URLs to export format", async () => {
      const mockHtml = "<html><body>Google Doc content</body></html>";
      const mockExtracted = {
        title: "Google Doc",
        html: "<p>Content</p>",
        word_count: 1,
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      await extractContent(
        "https://docs.google.com/document/d/ABC123/edit"
      );

      expect(mockScrapeURL).toHaveBeenCalledWith(
        "https://docs.google.com/document/d/ABC123/export?format=html",
        expect.any(Object)
      );
    });

    it("should rewrite Google Drive file URLs", async () => {
      const mockPdfContent = {
        title: "Drive PDF",
        html: "<p>PDF from Drive</p>",
        word_count: 3,
      };

      mockConvertPDFToHTML.mockResolvedValueOnce(mockPdfContent as any);
      // isUrlPDF sniffs the leading "%PDF-" magic bytes via grab().
      mockGrab.mockResolvedValueOnce(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer as any
      );

      await extractContent(
        "https://drive.google.com/file/d/ABC123/view"
      );

      expect(mockConvertPDFToHTML).toHaveBeenCalledWith(
        "https://drive.google.com/uc?export=download&id=ABC123",
        expect.any(Object)
      );
    });
  });

  describe("Error handling", () => {
    it("should return error if extraction returns error", async () => {
      const mockHtml = "<html><body>Content</body></html>";
      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce({
        error: "Failed to parse content",
      } as any);

      const result = await extractContent("https://example.com/article");

      expect(result.error).toBe("Failed to parse content");
    });

    it("should return error for invalid input type", async () => {
      const result = await extractContent({ invalid: "object" } as any);

      expect(result.error).toContain("Invalid input type");
    });
  });

  describe("Word count and citation", () => {
    it("should calculate word count from HTML", async () => {
      const mockHtml = "<html><body>Content</body></html>";
      const mockExtracted = {
        title: "Test Article",
        html: "<p>This is a test article with some words</p>",
        author_cite: "Doe, J.",
        date: "2024-01-15",
        source: "Example",
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      const result = await extractContent("https://example.com/article");

      expect(result.word_count).toBeGreaterThan(0);
    });

    it("should generate APA citation", async () => {
      const mockHtml = "<html><body>Content</body></html>";
      const mockExtracted = {
        title: "Test Article",
        html: "<p>Content</p>",
        author_cite: "Smith, J.",
        date: "2024-01-15",
        source: "Example News",
        word_count: 1,
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      const result = await extractContent("https://example.com/article");

      expect(result.cite).toContain("Smith, J.");
      expect(result.cite).toContain("(2024");
      expect(result.cite).toContain("Test Article");
      expect(result.cite).toContain("Example News");
    });

    it("should shorten long URLs in citation", async () => {
      const longUrl =
        "https://example.com/article?" +
        "param1=value1&param2=value2&param3=value3&" +
        "tracking=12345&sessionid=abcdefghijklmnopqrstuvwxyz&" +
        "utm_source=test&utm_medium=test&utm_campaign=test";

      const mockHtml = "<html><body>Content</body></html>";
      const mockExtracted = {
        title: "Article",
        html: "<p>Content</p>",
        word_count: 1,
      };

      mockScrapeURL.mockResolvedValueOnce(mockHtml);
      mockExtractContentAndCite.mockReturnValueOnce(mockExtracted);

      const result = await extractContent(longUrl);

      expect(result.url).toBe("https://example.com/article");
      expect(result.url).not.toContain("?");
    });
  });
});
