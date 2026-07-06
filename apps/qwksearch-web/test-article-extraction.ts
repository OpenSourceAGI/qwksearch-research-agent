/**
 * Test script to verify article extraction with Cloudflare scraper integration
 */
import { extractContent } from "ai-research-agent/extractor/url-to-content/url-to-content";

const testUrls = [
  "https://www.quora.com/What-is-the-de",
  "https://news.ycombinator.com/",
  "https://www.example.com/",
];

async function testArticleExtraction() {
  console.log("Testing article extraction with Cloudflare scraper...\n");

  for (const url of testUrls) {
    console.log(`\n========================================`);
    console.log(`Testing URL: ${url}`);
    console.log(`========================================`);

    try {
      const startTime = Date.now();
      const result = await extractContent(url, { timeout: 30 });
      const endTime = Date.now();

      console.log(`✓ Extraction completed in ${endTime - startTime}ms`);
      console.log(`  Title: ${result.title || 'N/A'}`);
      console.log(`  Author: ${result.author || 'N/A'}`);
      console.log(`  Date: ${result.date || 'N/A'}`);
      console.log(`  Source: ${result.source || 'N/A'}`);
      console.log(`  Word Count: ${result.word_count || 0}`);
      console.log(`  HTML Length: ${result.html?.length || 0}`);

      if (result.error) {
        console.log(`  ⚠ Error: ${result.error}`);
      }

      if (result.html && result.html.length > 0) {
        console.log(`  ✓ Successfully extracted content`);
        console.log(`  HTML Preview: ${result.html.substring(0, 200)}...`);
      } else {
        console.log(`  ✗ No HTML content extracted`);
      }
    } catch (error) {
      console.error(`✗ Extraction failed:`, error);
    }
  }

  console.log("\n========================================");
  console.log("Test completed!");
  console.log("========================================");
}

// Run the test
testArticleExtraction().catch(console.error);
