/**
 * @fileoverview Integration tests for web extraction tools
 * Tests the tool functions with realistic HTML extraction scenarios
 */

import { describe, it, expect, vi } from 'vitest';
import { AGENT_TOOLS } from '../src/tools/qwksearch-api-tools';
import * as QwkSearch from 'qwksearch-api-client';

// Mock the QwkSearch API client
vi.mock("qwksearch-api-client");

describe('Web Extraction Integration Tests', () => {
  const extractPageTool = AGENT_TOOLS.find(t => t.name === 'extract_page');

  describe('Real-world HTML Extraction Scenarios', () => {
    it('should extract a news article with complete metadata', async () => {
      const mockResponse = {
        data: {
          title: 'Breaking News: AI Advances in 2024',
          html: `
            <h1>Breaking News: AI Advances in 2024</h1>
            <p>Artificial intelligence has seen remarkable progress this year with new breakthroughs in natural language processing.</p>
            <p>Researchers have developed more efficient models that can understand context better than ever before.</p>
            <h2>Key Developments</h2>
            <p>The main advances include improved reasoning capabilities and better multilingual support.</p>
          `,
          cite: 'Smith, J. (2024, July 4). Breaking News: AI Advances in 2024. Tech News.',
          author: 'Jane Smith',
          author_cite: 'Smith, J.',
          author_short: 'Smith',
          author_type: 'single' as const,
          date: '2024-07-04',
          source: 'Tech News',
          word_count: 45,
          url: 'https://technews.com/ai-advances-2024'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://technews.com/ai-advances-2024',
        images: true,
        links: true,
        formatting: true,
        absoluteURLs: true,
        timeout: 10
      });

      expect(result).toContain('Breaking News: AI Advances in 2024');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('2024-07-04');
      expect(result).toContain('Word Count: 45');
      expect(result).toContain('Citation (APA Format):');
      expect(result).toContain('Smith, J.');
    });

    it('should handle blog post with multiple authors', async () => {
      const mockResponse = {
        data: {
          title: 'Guide to Modern Web Development',
          html: '<h1>Guide to Modern Web Development</h1><p>Learn the basics...</p>',
          cite: 'Doe, J., & Smith, B. (2024). Guide to Modern Web Development. Dev Blog.',
          author: 'John Doe and Bob Smith',
          author_cite: 'Doe, J., & Smith, B.',
          author_type: 'two-author' as const,
          date: '2024-06-15',
          source: 'Dev Blog',
          word_count: 1250,
          url: 'https://devblog.com/web-dev-guide'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://devblog.com/web-dev-guide'
      });

      expect(result).toContain('John Doe and Bob Smith');
      expect(result).toContain('Author Type: two-author');
      expect(result).toContain('Word Count: 1250');
    });

    it('should handle academic paper with organization author', async () => {
      const mockResponse = {
        data: {
          title: 'Research Report on Climate Change',
          html: '<h1>Research Report on Climate Change</h1><p>Executive summary...</p>',
          cite: 'National Research Council. (2024). Research Report on Climate Change.',
          author: 'National Research Council',
          author_cite: 'National Research Council',
          author_type: 'organization' as const,
          date: '2024-03-20',
          source: 'Research Institute',
          word_count: 5420,
          url: 'https://research.org/climate-report'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://research.org/climate-report'
      });

      expect(result).toContain('National Research Council');
      expect(result).toContain('Author Type: organization');
      expect(result).toContain('Word Count: 5420');
    });

    it('should handle article with more than two authors', async () => {
      const mockResponse = {
        data: {
          title: 'Collaborative Research Study',
          html: '<h1>Collaborative Research Study</h1><p>Study content...</p>',
          cite: 'Smith, J., Doe, B., Johnson, A., et al. (2024). Collaborative Research Study.',
          author: 'John Smith, Bob Doe, Alice Johnson, and Charlie Brown',
          author_cite: 'Smith, J., Doe, B., Johnson, A., et al.',
          author_type: 'more-than-two' as const,
          date: '2024-05-10',
          source: 'Science Journal',
          word_count: 3200,
          url: 'https://journal.com/study'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://journal.com/study'
      });

      expect(result).toContain('Author Type: more-than-two');
      expect(result).toContain('et al.');
    });

    it('should extract article with images and formatting', async () => {
      const mockResponse = {
        data: {
          title: 'Visual Guide to Programming',
          html: `
            <h1>Visual Guide to Programming</h1>
            <img src="https://example.com/image1.jpg" alt="Code example">
            <p>This guide includes <strong>important</strong> concepts.</p>
            <ul>
              <li>Variables</li>
              <li>Functions</li>
              <li>Classes</li>
            </ul>
            <a href="https://docs.example.com">Documentation</a>
          `,
          cite: 'Programmer, A. (2024). Visual Guide to Programming.',
          author: 'Alice Programmer',
          author_cite: 'Programmer, A.',
          author_type: 'single' as const,
          date: '2024-04-15',
          source: 'Programming Hub',
          word_count: 850,
          url: 'https://proghub.com/visual-guide'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://proghub.com/visual-guide',
        images: true,
        links: true,
        formatting: true
      });

      expect(result).toContain('Visual Guide to Programming');
      expect(result).toContain('<img');
      expect(result).toContain('<strong>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<a href');
    });

    it('should handle minimal article without metadata', async () => {
      const mockResponse = {
        data: {
          title: 'Simple Blog Post',
          html: '<h1>Simple Blog Post</h1><p>Just some content here.</p>',
          cite: 'Simple Blog Post. (n.d.). Retrieved from https://blog.com/post',
          word_count: 25,
          url: 'https://blog.com/post'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://blog.com/post'
      });

      expect(result).toContain('Simple Blog Post');
      expect(result).toContain('Word Count: 25');
      expect(result).not.toContain('Author:');
      expect(result).not.toContain('Publication Date:');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long articles', async () => {
      const longContent = '<p>' + 'word '.repeat(10000) + '</p>';
      const mockResponse = {
        data: {
          title: 'Very Long Article',
          html: longContent,
          cite: 'Author. (2024). Very Long Article.',
          word_count: 10000,
          url: 'https://example.com/long'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://example.com/long'
      });

      expect(result).toContain('Very Long Article');
      expect(result).toContain('Word Count: 10000');
    });

    it('should handle articles with special characters in title', async () => {
      const mockResponse = {
        data: {
          title: 'Article: "Special" <Characters> & Symbols™',
          html: '<h1>Content</h1>',
          cite: 'Author. (2024). Article: Special Characters & Symbols.',
          word_count: 100,
          url: 'https://example.com/special'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://example.com/special'
      });

      expect(result).toContain('Special');
      expect(result).toContain('Characters');
    });

    it('should handle articles with non-ASCII characters', async () => {
      const mockResponse = {
        data: {
          title: 'Article en Français: Les Développeurs',
          html: '<p>Contenu en français avec des accents: é, è, ê, ë, à, ù.</p>',
          cite: 'Auteur, J. (2024). Article en Français.',
          author: 'Jean Auteur',
          word_count: 150,
          url: 'https://example.fr/article'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://example.fr/article'
      });

      expect(result).toContain('Français');
      expect(result).toContain('Jean Auteur');
    });

    it('should handle URLs with query parameters', async () => {
      const mockResponse = {
        data: {
          title: 'Article with Query Params',
          html: '<p>Content</p>',
          cite: 'Author. (2024). Article with Query Params.',
          word_count: 50,
          url: 'https://example.com/article?utm_source=test&utm_campaign=demo'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      const result = await extractPageTool!.func({
        url: 'https://example.com/article?utm_source=test&utm_campaign=demo'
      });

      expect(result).toContain('Article with Query Params');
      expect(result).toContain('utm_source');
    });

    it('should handle timeout errors gracefully', async () => {
      vi.mocked(QwkSearch.getArticle).mockRejectedValueOnce(
        new Error('Request timeout after 10 seconds')
      );

      const result = await extractPageTool!.func({
        url: 'https://slow-website.com/article',
        timeout: 10
      });

      expect(result).toContain('Unable to extract content');
      expect(result).toContain('timeout');
    });

    it('should handle 404 errors', async () => {
      vi.mocked(QwkSearch.getArticle).mockRejectedValueOnce(
        new Error('404 Not Found')
      );

      const result = await extractPageTool!.func({
        url: 'https://example.com/nonexistent'
      });

      expect(result).toContain('Unable to extract content');
      expect(result).toContain('404');
    });

    it('should handle network errors', async () => {
      vi.mocked(QwkSearch.getArticle).mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      const result = await extractPageTool!.func({
        url: 'https://offline-site.com/article'
      });

      expect(result).toContain('Unable to extract content');
      expect(result).toContain('Network');
    });
  });

  describe('Configuration Options', () => {
    it('should respect images=false option', async () => {
      const mockResponse = {
        data: {
          title: 'Article',
          html: '<h1>Article</h1><p>Text only content.</p>',
          cite: 'Author. (2024). Article.',
          word_count: 50,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      await extractPageTool!.func({
        url: 'https://example.com',
        images: false
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            images: false
          })
        })
      );
    });

    it('should respect links=false option', async () => {
      const mockResponse = {
        data: {
          title: 'Article',
          html: '<h1>Article</h1><p>Content without links.</p>',
          cite: 'Author. (2024). Article.',
          word_count: 50,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      await extractPageTool!.func({
        url: 'https://example.com',
        links: false
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            links: false
          })
        })
      );
    });

    it('should respect formatting=false option', async () => {
      const mockResponse = {
        data: {
          title: 'Article',
          html: 'Plain text content.',
          cite: 'Author. (2024). Article.',
          word_count: 50,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      await extractPageTool!.func({
        url: 'https://example.com',
        formatting: false
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            formatting: false
          })
        })
      );
    });

    it('should respect custom timeout', async () => {
      const mockResponse = {
        data: {
          title: 'Article',
          html: '<p>Content</p>',
          cite: 'Author. (2024). Article.',
          word_count: 50,
          url: 'https://example.com'
        }
      };

      vi.mocked(QwkSearch.getArticle).mockResolvedValueOnce(mockResponse as any);

      await extractPageTool!.func({
        url: 'https://example.com',
        timeout: 30
      });

      expect(QwkSearch.getArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            timeout: 30
          })
        })
      );
    });
  });
});
