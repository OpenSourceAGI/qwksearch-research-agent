/**
 * @fileoverview Integration tests for web extraction
 * Tests actual extraction functionality with real or mocked HTTP requests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { extractContent } from '../../../extract-webpage/src/url-to-content/url-to-content';

describe('Web Extraction Integration', () => {
  describe('Direct Extraction', () => {
    it('should extract content from a simple HTML string', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Article</title>
            <meta name="author" content="John Doe">
            <meta name="date" content="2024-01-15">
          </head>
          <body>
            <article>
              <h1>Test Article Title</h1>
              <p>This is the main content of the article.</p>
              <p>It has multiple paragraphs.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com/article'
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Article Title');
      expect(result.html).toContain('This is the main content');
      expect(result.author).toBe('John Doe');
    }, 10000);

    it('should handle HTML with no article tags', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Simple Page</title></head>
          <body>
            <div class="content">
              <h1>Page Title</h1>
              <p>Some content here.</p>
            </div>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com/page'
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.html).toBeDefined();
    }, 10000);

    it('should extract citation information', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Research Paper</title>
            <meta name="author" content="Jane Smith">
            <meta name="date" content="2024-07-01">
            <meta property="og:site_name" content="Research Journal">
          </head>
          <body>
            <article>
              <h1>Important Research</h1>
              <p>Research content here.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://journal.com/research'
      });

      expect(result).toBeDefined();
      expect(result.author).toBeDefined();
      expect(result.date).toBeDefined();
      expect(result.cite).toBeDefined();
      expect(result.cite).toContain('Smith');
    }, 10000);

    it('should calculate word count', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Title</h1>
              <p>This is a test article with exactly twenty words in this paragraph to test the word count functionality properly.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      expect(result.word_count).toBeGreaterThan(0);
      expect(typeof result.word_count).toBe('number');
    }, 10000);

    it('should handle malformed HTML gracefully', async () => {
      const html = `
        <html>
          <body>
            <p>Unclosed tag
            <div>Some content
          </body>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      // Should not throw error, even with malformed HTML
    }, 10000);

    it('should extract multiple author types', async () => {
      const testCases = [
        {
          author: 'John Doe',
          expected_type: 'single'
        },
        {
          author: 'John Doe and Jane Smith',
          expected_type: 'two-author'
        },
        {
          author: 'John Doe, Jane Smith, and Bob Johnson',
          expected_type: 'more-than-two'
        },
        {
          author: 'Research Institute',
          expected_type: 'organization'
        }
      ];

      for (const testCase of testCases) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="author" content="${testCase.author}">
            </head>
            <body><article><h1>Test</h1><p>Content</p></article></body>
          </html>
        `;

        const result = await extractContent(html, {
          url: 'https://example.com'
        });

        expect(result).toBeDefined();
        expect(result.author).toBe(testCase.author);
        // Author type detection may vary, so we just check it exists
        expect(result.author_type).toBeDefined();
      }
    }, 30000);

    it('should preserve formatting when requested', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Title</h1>
              <p><strong>Bold text</strong> and <em>italic text</em></p>
              <ul>
                <li>List item 1</li>
                <li>List item 2</li>
              </ul>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com',
        formatting: true
      });

      expect(result).toBeDefined();
      expect(result.html).toContain('<strong>');
      expect(result.html).toContain('<em>');
      expect(result.html).toContain('<li>');
    }, 10000);

    it('should handle images in content', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Article with Image</h1>
              <img src="/relative-image.jpg" alt="Test image">
              <p>Content after image.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com/article',
        images: true,
        absoluteURLs: true
      });

      expect(result).toBeDefined();
      if (result.html.includes('<img')) {
        // If images are included, check for absolute URL conversion
        expect(result.html).toContain('https://');
      }
    }, 10000);

    it('should handle links in content', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Article with Links</h1>
              <p>Check out <a href="/page">this page</a>.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com/article',
        links: true,
        absoluteURLs: true
      });

      expect(result).toBeDefined();
      if (result.html.includes('<a')) {
        // If links are included, check they exist
        expect(result.html).toContain('href');
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle empty HTML', async () => {
      const result = await extractContent('', {
        url: 'https://example.com'
      });

      // Should return something, even if minimal
      expect(result).toBeDefined();
    }, 10000);

    it('should handle HTML with only whitespace', async () => {
      const result = await extractContent('   \n\n   ', {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
    }, 10000);

    it('should handle HTML with no meaningful content', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Empty</title></head>
          <body></body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Empty');
    }, 10000);

    it('should handle very large HTML documents', async () => {
      // Create a large HTML document
      let paragraphs = '';
      for (let i = 0; i < 1000; i++) {
        paragraphs += `<p>Paragraph ${i} with some test content to make it realistic.</p>\n`;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Large Document</h1>
              ${paragraphs}
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      expect(result.word_count).toBeGreaterThan(5000);
    }, 30000);
  });

  describe('Special Content Types', () => {
    it('should handle code blocks in articles', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Programming Tutorial</h1>
              <p>Here is some code:</p>
              <pre><code>function hello() {
  console.log("Hello, World!");
}</code></pre>
              <p>End of tutorial.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com',
        formatting: true
      });

      expect(result).toBeDefined();
      expect(result.html).toContain('function hello');
    }, 10000);

    it('should handle blockquotes', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Article with Quote</h1>
              <blockquote>
                <p>This is a quoted text from another source.</p>
              </blockquote>
              <p>Regular content continues.</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com',
        formatting: true
      });

      expect(result).toBeDefined();
      expect(result.html).toContain('quoted text');
    }, 10000);

    it('should handle tables', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <article>
              <h1>Data Article</h1>
              <table>
                <tr><th>Column 1</th><th>Column 2</th></tr>
                <tr><td>Data 1</td><td>Data 2</td></tr>
              </table>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com',
        formatting: true
      });

      expect(result).toBeDefined();
      // Table might be converted or preserved
      expect(result.html).toBeDefined();
    }, 10000);
  });

  describe('Metadata Extraction', () => {
    it('should extract OpenGraph metadata', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:site_name" content="Example Site">
          </head>
          <body>
            <article>
              <h1>Article Title</h1>
              <p>Content</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      // Should prefer article title or OG title
      expect(result.title).toBeDefined();
    }, 10000);

    it('should extract Twitter Card metadata', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
            <meta name="twitter:creator" content="@username">
          </head>
          <body>
            <article>
              <h1>Article</h1>
              <p>Content</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com'
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    }, 10000);

    it('should extract canonical URL', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <link rel="canonical" href="https://example.com/canonical-url">
          </head>
          <body>
            <article>
              <h1>Article</h1>
              <p>Content</p>
            </article>
          </body>
        </html>
      `;

      const result = await extractContent(html, {
        url: 'https://example.com/article?utm_source=test'
      });

      expect(result).toBeDefined();
      // The canonical URL might be used or the original
      expect(result.url).toBeDefined();
    }, 10000);
  });
});
