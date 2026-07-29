/**
 * @fileoverview Unit tests for QwkSearch API tools
 * Tests web_search and extract_page tools
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { AGENT_TOOLS } from '../src/tools/qwksearch-api-tools';
import * as QwkSearch from 'qwksearch-api-client';

// Mock the QwkSearch API client
vi.mock('qwksearch-api-client', () => ({
  agentSearch: vi.fn(),
  getArticle: vi.fn(),
}));

describe('QwkSearch API Tools', () => {
  let webSearchTool: any;
  let extractPageTool: any;

  beforeAll(() => {
    webSearchTool = AGENT_TOOLS.find(t => t.name === 'web_search');
    extractPageTool = AGENT_TOOLS.find(t => t.name === 'extract_page');
  });

  describe('Tool Registration', () => {
    it('should have web_search tool registered', () => {
      expect(webSearchTool).toBeDefined();
      expect(webSearchTool.name).toBe('web_search');
      expect(webSearchTool.description).toContain('Search the web');
    });

    it('should have extract_page tool registered', () => {
      expect(extractPageTool).toBeDefined();
      expect(extractPageTool.name).toBe('extract_page');
      expect(extractPageTool.description).toContain('Extract and summarize content');
    });
  });

  describe('web_search tool', () => {
    it('should validate schema for required query parameter', () => {
      const schema = webSearchTool.schema;
      expect(() => schema.parse({ query: 'test' })).not.toThrow();
      expect(() => schema.parse({})).toThrow();
    });

    it('should have correct default values', () => {
      const schema = webSearchTool.schema;
      const parsed = schema.parse({ query: 'test' });
      expect(parsed.category).toBe('general');
      expect(parsed.recency).toBe('none');
      expect(parsed.page).toBe(1);
      expect(parsed.language).toBe('en-US');
      expect(parsed.public).toBe(false);
      expect(parsed.timeout).toBe(10);
    });

    it('should call QwkSearch.agentSearch with correct parameters', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              title: 'Test Result',
              url: 'https://example.com',
              snippet: 'Test snippet',
              domain: 'example.com',
              engines: ['google', 'bing']
            }
          ]
        }
      };

      vi.mocked(QwkSearch.agentSearch).mockResolvedValueOnce(mockResponse as any);

      const result = await webSearchTool.func({
        query: 'test query',
        category: 'general',
        recency: 'none',
        page: 1,
        language: 'en-US',
        public: false,
        timeout: 10
      });

      expect(QwkSearch.agentSearch).toHaveBeenCalledWith({
        query: {
          q: 'test query',
          cat: 'general',
          recency: 'none',
          page: 1,
          lang: 'en-US',
          publicInstances: false,
          timeout: 10
        },
        baseUrl: expect.any(String),
        headers: undefined
      });

      expect(result).toContain('Test Result');
      expect(result).toContain('https://example.com');
      expect(result).toContain('Test snippet');
    });

    it('should handle empty search results', async () => {
      vi.mocked(QwkSearch.agentSearch).mockResolvedValueOnce({
        data: { results: [] }
      } as any);

      const result = await webSearchTool.func({ query: 'test' });
      expect(result).toContain('No search results found');
    });

    it('should handle search errors gracefully', async () => {
      vi.mocked(QwkSearch.agentSearch).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await webSearchTool.func({ query: 'test' });
      expect(result).toContain('Unable to perform web search');
      expect(result).toContain('Network error');
    });

    it('should pass custom baseURL and apiKey', async () => {
      const mockResponse = { data: { results: [] } };
      vi.mocked(QwkSearch.agentSearch).mockResolvedValueOnce(mockResponse as any);

      await webSearchTool.func({
        query: 'test',
        baseURL: 'https://custom.api.com',
        apiKey: 'custom-key'
      });

      expect(QwkSearch.agentSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://custom.api.com',
          headers: { 'x-api-key': 'custom-key' }
        })
      );
    });
  });

  describe('extract_page tool', () => {
    it('should validate schema for required url parameter', () => {
      const schema = extractPageTool.schema;
      expect(() => schema.parse({ url: 'https://example.com' })).not.toThrow();
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ url: 'not-a-url' })).toThrow();
    });

    it('should have correct default values', () => {
      const schema = extractPageTool.schema;
      const parsed = schema.parse({ url: 'https://example.com' });
      expect(parsed.images).toBe(true);
      expect(parsed.links).toBe(true);
      expect(parsed.formatting).toBe(true);
      expect(parsed.absoluteURLs).toBe(true);
      expect(parsed.timeout).toBe(10);
    });

    it('should call QwkSearch.getArticle with correct parameters', async () => {
      const mockResponse = {
        data: {
          title: 'Test Article',
          html: '<p>Test content</p>',
          cite: 'Author. (2024). Test Article. Example.com.',
          author: 'Test Author',
          author_cite: 'Author, T.',
          author_type: 'single',
          date: '2024-01-01',
          source: 'Example.com',
          word_count: 100,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool.func({
        url: 'https://example.com',
        images: true,
        links: true,
        formatting: true,
        absoluteURLs: true,
        timeout: 10
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith({
        query: {
          url: 'https://example.com',
          images: true,
          links: true,
          formatting: true,
          absoluteURLs: true,
          timeout: 10
        },
        baseUrl: expect.any(String),
        headers: undefined
      });

      expect(result).toContain('Test Article');
      expect(result).toContain('Test Author');
      expect(result).toContain('2024-01-01');
      expect(result).toContain('Word Count: 100');
      expect(result).toContain('<p>Test content</p>');
    });

    it('should handle extraction with no data', async () => {
      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce({
        data: null
      } as any);

      const result = await extractPageTool.func({
        url: 'https://example.com'
      });

      expect(result).toContain('No content could be extracted');
    });

    it('should handle extraction errors gracefully', async () => {
      vi.mocked(QwkSearch.getArticle).mockRejectedValueOnce(
        new Error('Timeout error')
      );

      const result = await extractPageTool.func({
        url: 'https://example.com'
      });

      expect(result).toContain('Unable to extract content');
      expect(result).toContain('Timeout error');
    });

    it('should pass custom baseURL and apiKey', async () => {
      const mockResponse = { data: null };
      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      await extractPageTool.func({
        url: 'https://example.com',
        baseURL: 'https://custom.api.com',
        apiKey: 'custom-key'
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://custom.api.com',
          headers: { 'x-api-key': 'custom-key' }
        })
      );
    });

    it('should handle partial article data gracefully', async () => {
      const mockResponse = {
        data: {
          title: 'Minimal Article',
          html: '<p>Content</p>',
          cite: 'Citation',
          word_count: 50,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool.func({
        url: 'https://example.com'
      });

      expect(result).toContain('Minimal Article');
      expect(result).toContain('<p>Content</p>');
      expect(result).not.toContain('Author:');
      expect(result).not.toContain('Publication Date:');
    });
  });

  describe('Integration: Parameter passing', () => {
    it('should properly construct baseUrl from baseURL parameter', async () => {
      const customBaseURL = 'https://my-custom-api.com/v1';

      vi.mocked(QwkSearch.agentSearch).mockResolvedValueOnce({
        data: { results: [] }
      } as any);

      await webSearchTool.func({
        query: 'test',
        baseURL: customBaseURL
      });

      expect(QwkSearch.agentSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: customBaseURL
        })
      );
    });

    it('should construct headers object when apiKey is provided', async () => {
      const apiKey = 'test-api-key-12345';

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce({
        data: null
      } as any);

      await extractPageTool.func({
        url: 'https://example.com',
        apiKey: apiKey
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'x-api-key': apiKey }
        })
      );
    });

    it('should not include headers when apiKey is not provided', async () => {
      vi.mocked(QwkSearch.agentSearch).mockResolvedValueOnce({
        data: { results: [] }
      } as any);

      await webSearchTool.func({
        query: 'test'
      });

      expect(QwkSearch.agentSearch).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: expect.anything()
        })
      );
    });
  });
});
