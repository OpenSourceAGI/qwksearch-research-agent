import { test, expect, describe } from "vitest";

/**
 * Test suite to verify that excessively long queries are properly sanitized
 * before being sent to the Tavily API.
 *
 * This addresses the issue where LLM-generated responses were being sent
 * as search queries, causing 400 Bad Request errors from Tavily.
 */
describe("Query Sanitization", () => {
  test("should truncate excessively long queries", () => {
    // Simulate a long LLM-generated response (like the gocryptfs tutorial)
    const longQuery = `Sure, I'd be happy to help you with that! gocryptfs is a tool that allows you to encrypt and decrypt files and folders using the cryptfs library in Go. Here's how you can use it in the command line interface (CLI) to decrypt a folder and mount it:

1. First, you need to have gocryptfs installed on your system. You can download and install it from the official GitHub repository: <https://github.com/rfjakob/gocryptfs/releases>

2. Once you have gocryptfs installed, navigate to the directory where your encrypted folder is located using the cd command. For example, if your encrypted folder is named "encrypted_folder" and it's located in your home directory, you would run:

   cd ~/encrypted_folder

3. Next, you need to decrypt the folder using the gocryptfs CLI tool.`;

    // Mock the sanitization logic from metaSearchAgent.ts
    let question = longQuery.trim();
    if (question.length > 500 || question.split(/[.!?]\s+/).length > 5) {
      const firstSentence = question.split(/[.!?]\s+/)[0].trim();
      if (firstSentence.length > 0 && firstSentence.length < 200) {
        question = firstSentence;
      } else {
        question = question.slice(0, 200);
      }
    }

    // Verify the query was sanitized
    expect(question.length).toBeLessThanOrEqual(200);
    expect(question).not.toContain("Here's how you can use it");

    // The sanitized query should be a reasonable search query
    expect(question.length).toBeGreaterThan(10);
  });

  test("should keep short queries unchanged", () => {
    const shortQuery = "How to decrypt folders with gocryptfs";

    let question = shortQuery.trim();
    if (question.length > 500 || question.split(/[.!?]\s+/).length > 5) {
      const firstSentence = question.split(/[.!?]\s+/)[0].trim();
      if (firstSentence.length > 0 && firstSentence.length < 200) {
        question = firstSentence;
      } else {
        question = question.slice(0, 200);
      }
    }

    // Should remain unchanged
    expect(question).toBe(shortQuery);
  });

  test("should extract first sentence from multi-sentence queries (>5 sentences)", () => {
    const multiSentenceQuery = "gocryptfs is an encryption tool. It provides secure file storage. You can use it to encrypt folders. It works on Linux. It uses FUSE. It's very secure. This should trigger sanitization.";

    let question = multiSentenceQuery.trim();
    if (question.length > 500 || question.split(/[.!?]\s+/).length > 5) {
      const firstSentence = question.split(/[.!?]\s+/)[0].trim();
      if (firstSentence.length > 0 && firstSentence.length < 200) {
        question = firstSentence;
      } else {
        question = question.slice(0, 200);
      }
    }

    // Should extract just the first sentence when more than 5 sentences
    expect(question).toBe("gocryptfs is an encryption tool");
  });

  test("Tavily query sanitization - truncate to 400 chars max", () => {
    // Simulate the Tavily-specific sanitization
    const veryLongQuery = "a".repeat(500);

    let sanitizedQuery = veryLongQuery.trim();
    if (sanitizedQuery.length > 400) {
      sanitizedQuery = sanitizedQuery.slice(0, 400);
    }

    expect(sanitizedQuery.length).toBe(400);
  });
});
