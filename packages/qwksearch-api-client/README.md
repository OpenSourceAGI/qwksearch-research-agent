<p align="center">
    <img  src="https://i.imgur.com/ZMY9Xy7.png" />
<br />
    <a href="https://doi.org/10.5281/zenodo.20951725"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.20951725.svg" alt="DOI"></a>
    <a href="https://deepwiki.com/OpenSourceAGI/qwksearch-research-agent"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
    <a href="https://qwksearch.com/api/docs"><img src="https://ihttps://www.npmjs.com/package/pdf-to-html-doclingmg.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/API-blue?logo=fastapi&logoColor=white" alt="API badge"></a>
     <br />
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions"><img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/dm/qwksearch-api-client.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/graphs/contributors" alt="Activity"><img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" /></a>
     <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
     <br />
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/v/qwksearch-api-client.svg" alt="npm version"></a>
    <a href="https://bundlephobia.com/package/qwksearch-api-client" target="_blank" rel="noopener noreferrer">
  <img
    src="https://img.shields.io/bundlephobia/minzip/qwksearch-api-client?style=flat&label=size"
    alt="npm bundle size "
  />
</a>
    <a href="https://discord.gg/SJdBqBz3tV"><img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat" alt="Join Discord" /></a>
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" /></a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent"><img src="https://github.com/codespaces/badge.svg" width="150" height="20" /></a>
    <br />
    <img src="https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff" alt="Claude AI"> <img src="https://img.shields.io/badge/Cloudflare-F38020?logo=Cloudflare&logoColor=white" alt="Cloudflare"> <img src="https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=fff" alt="shadcn/ui"> <img src="https://img.shields.io/badge/Next.js-black" alt="Next.js" />
    <a href="https://better-auth.com/docs/introduction" target="_blank"><img src="https://i.imgur.com/eaGdjBq.png" alt="better-auth" /></a>
 </p>

<p align="center">
  <a href="https://qwksearch.com">Demo</a> •
  <a href="https://airesearch.js.org">Documentation</a> •
  <a href="https://github.com/vtempest/ai-research-agent">GitHub</a>
</p>


## 🧠💻 Reimagine the Internet as Self-Organizing Mind Map

<p align="center">
 <img  src="https://i.imgur.com/Z9OJMwd.gif" />
</p>

Critical times call for critical thinkers to create a crowdsourced argument reasoning dataset, for AI models to recommend research quotes, to evolve crowdsourced chain-of-thought reasoning, to unlock faster ways to read long articles, to monitor developments by topic modeling a knowledge base graph, and to provide a public service of answers to research.

Language Models can distill the essence of collective thought into a vector space where every point has a weighted value representing its contribution to the overall decision-making process. AI will show its reasoning based on what sentences and cites it used from the collective research, so that people can see it is aligned with our interests. Research Agents recommend articles for human researchers working alongside AI to develop a summarized topic outline as a public service. The agents monitor for any related articles via web searches for keywords associated with that Topic Model. Imagine uploading a research paper, then the app extracts full text of reference cites and creates topic model and keyword summaries, then monitors that literature base and stores highlights. People will make personal knowledge bases of what influences them to create AI assistants cloning their mind-uploaded perspective and interests in a self-organizing mind map.

```bash
# Download Source
bun x git0 vtempest/qwksearch-research-agent
```

```bash
# Import API Client
bun i qwksearch-api-client
```

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
