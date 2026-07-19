<p align="center">
  <img src="https://i.imgur.com/DqnjYfC.png" alt="QwkSearch Logo" width="200"/>
</p>

<p align="center">
  <strong>Search, extract, vectorize and outline a topic base with AI Research Agent</strong>
</p>

<p align="center">
  <a href="https://qwksearch.com">Demo</a> •
  <a href="https://airesearch.js.org">Documentation</a> •
  <a href="https://github.com/vtempest/ai-research-agent">GitHub</a>
</p>

## Overview

QwkSearch API provides three core services for AI-powered research and content analysis:

1. **Content Extraction** - Extract structured content and citations from any URL
2. **Language Generation** - Generate AI responses using multiple language model providers
3. **Web Search** - Search the web using  metasearch engine across 100+ sources



## Complete Example: Research Pipeline

Combine all three endpoints to create a complete research pipeline:

```javascript
import * as qwk from 'qwksearch-api-client';

async function researchTopic(topic) {
  // 1. Search for relevant articles
  const searchResults = await qwk.searchWeb({
    query: {
      q: topic,
      cat: 'science',
      recency: 'month'
    }
  });

  console.log(`Found ${searchResults.results.length} results`);

  // 2. Extract content from top 3 results
  const articles = await Promise.all(
    searchResults.results.slice(0, 3).map(async (result) => {
      const content = await qwk.extractContent({
        query: {
          url: result.url
        }
      });
      return content;
    })
  );

  // 3. Generate summary of all articles
  const combinedText = articles
    .map(a => `${a.title}\n\n${a.html}`)
    .join('\n\n---\n\n');

  const summary = await qwk.writeLanguage({
    body: {
      provider: 'groq',
      key: process.env.GROQ_API_KEY,
      agent: 'summarize-bullets',
      article: combinedText
    }
  });

  return {
    searchResults: searchResults.results,
    articles,
    summary: summary.content
  };
}

// Run the research pipeline
researchTopic('quantum computing applications')
  .then(results => {
    console.log('Research Summary:');
    console.log(results.summary);
  });
```

---


## API Endpoints

### 1. Extract Content (`/extract`)

Extract structured content, citations, and metadata from any URL including articles, PDFs, and YouTube videos.

#### Features

- **Main Content Detection**: Combines Mozilla Readability and Postlight Mercury algorithms with 100+ custom adapters
- **HTML Standardization**: Transforms complex HTML into simplified reading-mode format
- **YouTube Transcripts**: Retrieves complete video transcripts with timestamps
- **PDF Processing**: Extracts formatted text and infers heading hierarchy
- **Citation Extraction**: Identifies author names, publication dates, sources, and titles
- **Author Formatting**: Validates against 90,000+ name database for proper citation formatting

#### Request

```http
GET /extract?url={url}&images={boolean}&links={boolean}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string (uri) | Yes | - | URL to extract content from |
| `images` | boolean | No | true | Include images in output |
| `links` | boolean | No | true | Include hyperlinks in output |
| `formatting` | boolean | No | true | Preserve text formatting |
| `absoluteURLs` | boolean | No | true | Convert relative URLs to absolute |
| `timeout` | integer | No | 5 | HTTP request timeout (1-30 seconds) |


### 2. Generate Language (`/agents`)

Generate AI responses using various language model providers with pre-built agent templates.

#### Language Intelligence Providers (LIPs)

| Provider | Model Families | Cost (1M Output) | Valuation |
|----------|----------------|------------------|-----------|
| **Groq** | Llama, DeepSeek, Gemini, Mistral | $0.79 | $2.8B |
| **Ollama** | llama, mistral, mixtral, gemma, qwen, deepseek | $0 (local) | - |
| **OpenAI** | o1, o4, gpt-4, gpt-4-turbo, gpt-4-omni | $8.00 | $300B |
| **Anthropic** | Claude Sonnet, Opus, Haiku | $15.00 | $61.5B |
| **TogetherAI** | Llama, Mistral, Qwen, DeepSeek | $0.90 | $3.3B |
| **Perplexity** | Sonar, Sonar Deep Research | $15.00 | $18B |
| **XAI** | Grok, Grok Vision | $15.00 | $80B |
| **Google** | Gemini | $10.00 | - |
| **Cloudflare** | Llama, Gemma, Mistral, Phi, Qwen | $2.25 | $62.3B |

#### Agent Templates

| Agent | Context Variables | Description |
|-------|------------------|-------------|
| `question` | query, chat_history | Answer questions with conversation context |
| `summarize-bullets` | article | Create bullet-point summaries |
| `summarize` | article | Generate narrative summaries |
| `suggest-followups` | chat_history, article | Suggest follow-up questions (returns string[]) |
| `answer-cite-sources` | context, chat_history, query | Answer with source citations |
| `query-resolution` | chat_history, query | Resolve ambiguous queries |
| `knowledge-graph-nodes` | query, article | Extract knowledge graph nodes |
| `summary-longtext` | summaries | Summarize multiple summaries |

#### Request

```http
POST /agents
Content-Type: application/json

{
  "provider": "groq",
  "key": "your-api-key",
  "agent": "question",
  "model": "llama-3.3-70b-versatile",
  "query": "What is quantum computing?",
  "temperature": 1.0,
  "html": true
}
```

**Body Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `provider` | string | Yes | - | LIP provider: groq, openai, anthropic, together, xai, google, perplexity, ollama, cloudflare |
| `key` | string | Yes | - | API key for the provider |
| `agent` | string | No | question | Agent template name |
| `model` | string | No | llama-4-maverick-17b | Model name for the provider |
| `html` | boolean | No | true | Format response as HTML (true) or Markdown (false) |
| `temperature` | number | No | 1.0 | 0-1: deterministic, 1-2: creative |
| `query` | string | No | - | Query text for certain agents |
| `chat_history` | string | No | - | Conversation history for certain agents |
| `article` | string | No | - | Article text for summarization agents |

#### Response

**200 OK**

```json
{
  "content": "Generated response in HTML or Markdown format",
  "extract": {
    "structured": "data"
  }
}
```

#### Example Usage

```javascript
import * as qwk from 'qwksearch-api-client';

// Question answering
const response = await qwk.writeLanguage({
  body: {
    provider: 'groq',
    key: process.env.GROQ_API_KEY,
    agent: 'question',
    query: 'Explain neural networks',
    temperature: 0.7
  }
});

const { content } = response;
console.log(content);

// Summarize article
const summary = await qwk.writeLanguage({
  body: {
    provider: 'anthropic',
    key: process.env.ANTHROPIC_API_KEY,
    agent: 'summarize-bullets',
    article: articleText,
    html: false // Get Markdown
  }
});

// Answer with citations
const answer = await qwk.writeLanguage({
  body: {
    provider: 'openai',
    key: process.env.OPENAI_API_KEY,
    agent: 'answer-cite-sources',
    query: 'What causes climate change?',
    context: 'Scientific articles about greenhouse gases...',
    temperature: 0.5
  }
});
console.log(answer.content);
```

---

### 3. Search Web (`/search`)

Search the web using  metasearch engine aggregating 100+ search sources.

#### Features

- **Privacy-Focused**: No tracking or personal data collection
- **Multiple Categories**: General, news, videos, images, science, files, IT
- **Recency Filters**: Filter by day, week, month, year
- **Multi-Language**: Support for various languages
- **Diverse Sources**: Aggregates from 100+ search engines
- Search index exceeds 100,000,000 GB covering 130 trillion pages
- Uses 200+ ranking factors including keywords, backlinks, page speed

#### Request

```http
GET /search?q={query}&cat={category}&recency={filter}&lang={language}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query string |
| `cat` | string | No | general | Category: general, news, videos, images, science, files, it |
| `recency` | string | No | all | Time filter: all, day, week, month, year |
| `safesearch` | boolean | No | false | Block adult content |
| `public` | boolean | No | false | Use public server instances |
| `page` | integer | No | 1 | Pagination for results |
| `lang` | string | No | en-US | Language code |

#### Response

**200 OK**

```json
{
  "results": [
    {
      "title": "Search result title",
      "url": "https://example.com/page",
      "snippet": "Text snippet around the query...",
      "domain": "example.com",
      "favicon": "https://example.com/favicon.ico",
      "path": "/page",
      "engines": "google,bing"
    }
  ]
}
```

## Installation

### NPM Package

```bash
npm install qwksearch-api-client
```

---



## Links

- **Documentation**: [airesearch.js.org](https://airesearch.js.org/)
- **Demo**: [qwksearch.com](https://qwksearch.com/)
- **GitHub**: [github.com/vtempest/ai-research-agent](https://github.com/vtempest/ai-research-agent)
- **OpenAPI Spec**: [View Full Specification](./qwksearch-openapi.yml)

- [LLM Training Example](https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js)
- [LangChain ReactAgent Tools](https://medium.com/@terrycho/how-langchain-agent-works-internally-trace-by-using-langsmith-df23766e7fb4)
- [Hugging Face Tutorials](https://huggingface.co/learn)
- [OpenAI Cookbook](https://cookbook.openai.com)
- [Transformer Overview](https://jalammar.github.io/illustrated-transformer/)
- [Building Transformer Guide](https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch)
- [PyTorch Overview](https://www.learnpytorch.io/pytorch_cheatsheet/)
- [SearXNG Overview](https://medium.com/@elmo92/search-in-peace-with--an-alternative-search-engine-that-keeps-your-searches-private-accd8cddd6fc)
- [Evaluating Large Language Models in Scientific Discovery](https://arxiv.org/pdf/2512.15567)
---
