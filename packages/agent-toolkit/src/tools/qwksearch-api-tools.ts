/**
 * @fileoverview Specialized tools for AI agents to interact with the QwkSearch API.
 * Provides web search, content extraction, and AI response generation.
 */

// @ts-nocheck
import { z } from "zod";
import * as QwkSearch from 'qwksearch-api-client'; // Update this path to match your QwkSearch module location

// Configuration for QwkSearch API
const QWKSEARCH_CONFIG = {
  baseURL: typeof process !== "undefined" && process?.env.QWKSEARCH_URL || 'https://api.qwksearch.com',
  apiKey: typeof process !== "undefined" && process?.env.QWKSEARCH_API_KEY || null,
};

/**
 * List of tools available for agent usage, including their schemas and implementation.
 */
export const AGENT_TOOLS = [

  {
    name: "web_search",
    description:
      "Search the web for information on any topic using QwkSearch API. Input: search query string and optional category. Returns relevant search results with titles, descriptions, and URLs from 100+ sources via SearXNG metasearch engine.",
    schema: z.object({
      query: z.string(),
      category: z.enum(["general", "news", "videos", "images", "science", "files", "it"]).optional().default("general"),
      recency: z.enum(["none", "day", "week", "month", "year"]).optional().default("none"),
      page: z.number().optional().default(1),
      language: z.string().optional().default("en-US"),
      public: z.boolean().optional().default(false),
      timeout: z.number().optional().default(10),
      baseURL: z.string().optional(),
      apiKey: z.string().optional()
    }),
    func: async ({ query, category = "general", recency = "none", page = 1, language = "en-US", public: isPublic = false, timeout = 10, baseURL, apiKey }) => {
      try {
        // Use provided config or fall back to environment/defaults
        const config = {
          baseURL: baseURL || QWKSEARCH_CONFIG.baseURL,
          apiKey: apiKey || QWKSEARCH_CONFIG.apiKey
        };

        const result = await QwkSearch.searchWeb({
          query: {
            q: query,
            cat: category,
            recency: recency,
            page: page,
            lang: language,
            public: isPublic,
            timeout: timeout
          },
          config: config
        });

        if (!result.data || !result.data.results || result.data.results.length === 0) {
          return `No search results found for "${query}". Please try a different search term.`;
        }

        let resultText = `Web search results for "${query}" (${category} category):\n\n`;

        result.data.results.forEach((searchResult, index) => {
          resultText += `${index + 1}. ${searchResult.title}\n`;
          resultText += `   URL: ${searchResult.url}\n`;
          if (searchResult.domain) {
            resultText += `   Domain: ${searchResult.domain}\n`;
          }
          if (searchResult.snippet) {
            resultText += `   Description: ${searchResult.snippet}\n`;
          }
          if (searchResult.engines && searchResult.engines.length > 0) {
            resultText += `   Sources: ${searchResult.engines.join(", ")}\n`;
          }
          resultText += `\n`;
        });

        resultText += `Found ${result.data.results.length} results from multiple search engines. This is the complete search information.`;

        return resultText;
      } catch (error) {
        return `Unable to perform web search for "${query}". Error: ${error.message}`;
      }
    },
  },
  {
    name: "extract_page",
    description:
      "Extract and summarize content from a web page using QwkSearch API. Supports articles, PDFs, and YouTube videos. Uses Mozilla Readability and Postlight Mercury algorithms with 100+ custom adapters for major sites. Input: URL of the page to extract. Returns structured content with citation information.",
    schema: z.object({
      url: z.string().url(),
      images: z.boolean().optional().default(true),
      links: z.boolean().optional().default(true),
      formatting: z.boolean().optional().default(true),
      absoluteURLs: z.boolean().optional().default(true),
      timeout: z.number().min(1).max(30).optional().default(10),
      baseURL: z.string().optional(),
      apiKey: z.string().optional()
    }),
    func: async ({ url, images = true, links = true, formatting = true, absoluteURLs = true, timeout = 10, baseURL, apiKey }) => {
      try {
        // Use provided config or fall back to environment/defaults
        const config = {
          baseURL: baseURL || QWKSEARCH_CONFIG.baseURL,
          apiKey: apiKey || QWKSEARCH_CONFIG.apiKey
        };

        const result = await QwkSearch.extractContent({
          query: {
            url: url,
            images: images,
            links: links,
            formatting: formatting,
            absoluteURLs: absoluteURLs,
            timeout: timeout
          },
          config: config
        });

        if (!result.data) {
          return `No content could be extracted from "${url}". Please check the URL and try again.`;
        }

        const data = result.data;

        let resultText = `Content extracted from: ${data.url || url}\n\n`;

        if (data.title) {
          resultText += `Title: ${data.title}\n\n`;
        }

        if (data.author) {
          resultText += `Author: ${data.author}\n`;
          if (data.author_cite) {
            resultText += `Author (Citation Format): ${data.author_cite}\n`;
          }
          if (data.author_type) {
            resultText += `Author Type: ${data.author_type}\n`;
          }
        }

        if (data.date) {
          resultText += `Publication Date: ${data.date}\n`;
        }

        if (data.source) {
          resultText += `Source: ${data.source}\n`;
        }

        if (data.word_count) {
          resultText += `Word Count: ${data.word_count}\n`;
        }

        if (data.cite) {
          resultText += `\nCitation (APA Format): ${data.cite}\n`;
        }

        if (data.html) {
          resultText += `\nContent:\n${data.html}\n\n`;
        }

        resultText += `This is the complete page extraction information.`;

        return resultText;
      } catch (error) {
        return `Unable to extract content from "${url}". Error: ${error.message}`;
      }
    },
  },
  {
    name: "generate_ai_response",
    description:
      "Generate AI language model responses using QwkSearch API with various agent templates. Supports multiple providers (Groq, OpenAI, Anthropic, etc.) and agent types for different tasks like summarization, question answering, and content generation.",
    schema: z.object({
      provider: z.enum(["groq", "openai", "anthropic", "together", "xai", "google", "perplexity", "ollama", "cloudflare"]),
      key: z.string().optional(),
      agent: z.enum([
        "question",
        "summarize-bullets",
        "summarize",
        "suggest-followups",
        "answer-cite-sources",
        "query-resolution",
        "knowledge-graph-nodes",
        "summary-longtext"
      ]).optional().default("question"),
      model: z.string().optional().default("meta-llama/llama-4-maverick-17b-128e-instruct"),
      temperature: z.number().min(0).max(2).optional().default(0.7),
      html: z.boolean().optional().default(true),
      query: z.string().optional(),
      chat_history: z.string().optional(),
      article: z.string().optional(),
      baseURL: z.string().optional(),
      apiKey: z.string().optional()
    }),
    func: async ({ provider, key, agent = "question", model = "meta-llama/llama-4-maverick-17b-128e-instruct", temperature = 0.7, html = true, query, chat_history, article, baseURL, apiKey }) => {
      try {
        // Use provided config or fall back to environment/defaults
        const config = {
          baseURL: baseURL || QWKSEARCH_CONFIG.baseURL,
          apiKey: apiKey || QWKSEARCH_CONFIG.apiKey
        };

        const requestBody = {
          agent,
          provider,
          model,
          html,
          temperature
        };

        if (key) {
          requestBody.key = key;
        }

        if (query) {
          requestBody.query = query;
        }

        if (chat_history) {
          requestBody.chat_history = chat_history;
        }

        if (article) {
          requestBody.article = article;
        }

        const result = await QwkSearch.writeLanguage({
          body: requestBody,
          config: config
        });

        if (!result.data) {
          return `No response generated. Please check your input parameters and try again.`;
        }

        let resultText = `AI Response (${agent} agent, ${provider} provider):\n\n`;

        if (result.data.content) {
          resultText += result.data.content;
        }

        if (result.data.extract) {
          resultText += `\n\nStructured Extract:\n${JSON.stringify(result.data.extract, null, 2)}`;
        }

        resultText += `\n\nThis is the complete AI-generated response.`;

        return resultText;
      } catch (error) {
        return `Unable to generate AI response. Error: ${error.message}`;
      }
    },
  },
];