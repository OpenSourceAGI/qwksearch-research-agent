<p align="center">
    <img width="350px" src="https://i.imgur.com/8JvNmxU.jpeg" />
</p>
<p align="center">
    <a href="https://npmjs.org/package/extract-webpage">
        <img src="https://img.shields.io/npm/v/extract-webpage" alt="NPM version" />
    </a>
    <a href="https://npmjs.org/package/extract-webpage">
        <img alt="NPM Downloads" src="https://img.shields.io/npm/dy/extract-webpage" />
    </a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" />
    </a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions">
        <img alt="GitHub Stars" src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" />
    </a>
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    </a>
</p>
<h3 align="center"><a href="https://airesearch.js.org/">📑 Docs (airesearch.js.org)</a>  <a href="https://qwksearch.com/">🚀 Demo</a></h3>

## extract-webpage

Search, extract, cite, and outline the web for a topic with AI Research Agent. This package provides the core pipeline for turning URLs into structured content: fetching pages, extracting readable text, identifying citations, summarizing keyphrases, and tokenizing for search.

```bash
npm install extract-webpage
```

---

### 🚜📜 Tractor the Text Extractor

<p align="center">
<img width="350px" src="https://i.imgur.com/o8NTXxY.png" />
</p>

[extract Docs](https://airesearch.js.org/functions/extractor/url-to-content/)

1. **Main Content Detection**: Extract the main content from a URL by combining Mozilla Readability and Postlight Mercury algorithms, utilizing over 100 custom adapters for major sites for article, author, date HTML classes.
2. **Basic HTML Standardization**: Transform complex HTML into a simplified reading-mode format of basic HTML, making it ideal for research note archival and focused reading, with headings, images, and links.
3. **YouTube Transcript Processing**: When a YouTube video URL is detected, retrieve the complete video transcript including both manual captions and auto-generated subtitles, maintaining proper timestamp synchronization.
4. **DOCX Extraction**: Extracts text and structure from Word documents.
5. **PDF to HTML**: Extracts formatted text from PDF with parsing of linebreaks, page headers, footnotes, and section headings. Supports fonts, links, bold, italics, lists, headings, headers, footnotes, Table of Contents, Quotes, and Code Blocks. Uses [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless) to work in Cloudflare workers, serverless, Node.js, and front-end environments.
6. **Cite**: Identify and extract citation metadata including author names, publication dates, sources, and titles using HTML meta tags and common class name patterns. Validates author names against a database of 90,000 first and last names to distinguish personal from organizational authors.

---

### 🕸️🖥️ Tardigrade the Web Crawler

<p align="center">
<img src="https://i.imgur.com/iuzpcvD.png" width="350px" />
</p>

[scrapeURL Docs](https://airesearch.js.org/functions/extractor/url-to-content/scrape-url)

1. **Fetch API first**: Scrape any domain's URL to get its HTML, JSON, or binary buffer. Includes timeout, redirects, default user agent, referer as Google, and bot detection checking.
2. **Docker fallback**: If fetch does not return needed HTML, use a Docker container with proxy as backup.
3. **Puppeteer rendering**: NodeJS server renders with Puppeteer DOM to get all HTML loaded by secondary in-page API requests after the initial page load, including user login and cookie storage.
4. **Cloudflare bypass**: A webpage proxy that requests through Chromium (Puppeteer) to bypass Cloudflare anti-bot using cookie id JavaScript method.
5. **Usage**: `http://localhost:3000/?url=https://example.org`

---

### 🔍 Web Search

Federated web search via multiple backends:

- **Tavily**: AI-optimized search API with result extraction.
- **SearXNG**: Open-source metasearch engine aggregating major search engines.
- **Meta Search Agent**: Unified interface over multiple search providers.

[searchSTREAM Docs](https://airesearch.js.org/functions/search/search-stream)

---

### 🔤📊 SEEKTOPIC: Summarization by Extracting Entities, Keyword Tokens, and Outline Phrases Important to Context

<p align="center">
<img width="350px" src="https://i.imgur.com/nMoDgz6.jpeg" />
</p>

[extractSEEKTOPIC Docs](https://airesearch.js.org/functions/topics/seektopic-keyphrases)
[SEEKTOPIC Sample Output](https://github.com/vtempest/ai-research-agent/blob/master/test/data/)

SEEKTOPIC extracts unique, domain-specific key phrases from a document using noun n-grams and ranks sentences based on their centrality to the most frequently referenced key phrase concepts.

1. **Sentence Segmentation**: Split text into sentences, accounting for common abbreviations, numbers, URLs, and other exceptions.
2. **Tokenization and Phrase Extraction**: Employ a Wiki Phrases tokenizer to identify wiki topics, phrases, and nouns. Includes spell-checking and root word checking via Porter Stemmer.
3. **Noun N-gram Extraction**: Generate noun edge-grams, allowing for stop words in the middle (e.g., "state of the art").
4. **Key Phrase Consolidation**: Merge smaller n-grams that are subsets of larger ones by comparing weights.
5. **Domain Specificity Calculation**: Determine named entities and phrase domain specificity using WikiIDF, rewarding unique key phrases specific to the document's field.
6. **Graph Construction**: Create a double-ring weighted graph with key phrases in the central ring and sentences in the outer ring.
7. **Sentence Weighting**: Apply TextRank algorithm to weight sentences, identifying those that centralize and connect key phrase concepts most referenced by other sentences.
8. **Dynamic Reranking**: If a user interacts with a key phrase or a search query leads to the document, compare query similarity to key phrases, heavily weight the most similar key phrase, and reapply TextRank.

---

### 🧩🔍 Autocomplete & Query-to-Topic Phrase Tokenization

<p align="center">
    <img width="350px" src="https://i.imgur.com/tMjFGe4.jpeg" />
</p>

[suggestNextWordCompletions Docs](https://airesearch.js.org/functions/tokenize/suggest-complete-word)

Search-on-keystroke word and phrase completion, sorted by IDF frequency, for search autocomplete dropdowns. Tokenizes by phrase rather than individual word to improve search accuracy — "white house" or "state of the art" are extracted and searched as phrases rather than split into independent words.

Additional tokenization utilities:
- **text-to-sentences**: Split text into sentence segments.
- **text-to-chunks**: Split text into LLM-ready chunks.
- **text-to-topic-tokens**: Extract topic tokens from text.
- **word-to-root-stem**: Porter Stemmer for root word normalization.

---

## Usage

```ts
import {
  urlToContent,
  urlToHtml,
  htmlToContent,
  htmlToCite,
  seektopicKeyphrases,
  searchWeb,
  suggestCompleteWord,
} from "extract-webpage";

// Fetch and extract content from a URL
const content = await urlToContent("https://example.com/article");

// Extract keyphrases and top sentences
const { keyphrases, sentences } = seektopicKeyphrases(content.text);

// Search the web
const results = await searchWeb("AI research agents");
```

<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /> Please star this repo for updates! 🌟
