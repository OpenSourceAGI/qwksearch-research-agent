<p align="center">
    <img src="https://i.imgur.com/ZMY9Xy7.png" />
    <a href="https://better-auth.com/docs/introduction" target="_blank"><img src="https://i.imgur.com/eaGdjBq.png" alt="better-auth" /></a>
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://qwksearch.com/api/docs"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/dm/qwksearch-api-client.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/v/qwksearch-api-client.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/dt/qwksearch-api-client.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/qwksearch-api-client"><img src="https://img.shields.io/npm/types/qwksearch-api-client" alt="TypeScript types" /></a>
    <a href="https://packagephobia.com/result?p=qwksearch-api-client"><img src="https://packagephobia.com/badge?p=qwksearch-api-client" alt="Install size" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/qwksearch-research-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/qwksearch-research-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/qwksearch-research-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/qwksearch-research-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/qwksearch-research-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <a href="https://stackblitz.com/github/OpenSourceAGI/qwksearch-research-agent/tree/master/packages/qwksearch-api-client"><img height="20px" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

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

The typed client for the QwkSearch API — 85 functions generated from
[`qwksearch-openapi.json`](./qwksearch-openapi.json) with
[Hey API](https://heyapi.dev), covering research chat and search, article Q&A,
URL/PDF/YouTube scraping, the REASON document store, voice, provider and model
config, MCP servers, NotebookLM and accounts.



## Transport: every call goes through `grab`

The generated SDK is wired to [**api2client**](https://github.com/OpenSourceAGI/GRAB-URL/tree/master/packages/api2client),
a [Hey API](https://heyapi.dev) client backed by [`grab`](https://grab.js.org),
rather than to `fetch`. The functions, their options and the
`{ data, error, request, response }` result are unchanged — only the transport
underneath is different — so every endpoint in this client picks up grab's
caching, retries, rate limiting, request dedupe, mock server and shared
request log.

Those are per-request options, alongside the usual `body`/`path`/`query`:

```javascript
const { data, error } = await agentSearch({
  query: { q: 'quantum computing' },
  cache: true,          // serve repeats from grab's cache
  cacheForTime: 60,     // …for 60 seconds
  retryAttempts: 2,
  timeout: 15,
  rateLimit: 1,         // min seconds between calls to this path
});
```

Or client-wide, for every call on that client:

```javascript
import { createClient, createConfig } from 'qwksearch-api-client/client';

const client = createClient(createConfig({ cache: true, retryAttempts: 2 }));
await agentSearch({ query: { q: 'quantum computing' }, client });
```

Because grab keys its cache, dedupe and mocks by **path**, an endpoint can be
stubbed without touching the network:

```javascript
import { grab } from 'grab-url';

grab.mock['/agent/search'] = { response: { results: [] } };
```

> Recovering the HTTP status and the parsed error body from behind grab needs
> its `onRawResponse` hook, added in **grab-url 1.6.23**. On an older grab,
> api2client cannot hand back a `Response`, so `result.response` is
> `undefined` and `result.error` is grab's own `"HTTP error: <status>"` string
> instead of the handler's JSON body.

## Complete Example: Research Pipeline

Search the web, read the top results, then ask a question grounded in them:

```javascript
import { agentSearch, scrapeGet, articleQa } from 'qwksearch-api-client';

async function researchTopic(topic) {
  // 1. Search for relevant articles
  const { data: search } = await agentSearch({
    query: { q: topic, cat: 'science', recency: 'month' },
  });

  console.log(`Found ${search.results.length} results`);

  // 2. Read the top 3 results
  const articles = await Promise.all(
    search.results.slice(0, 3).map(async ({ url }) => {
      const { data } = await scrapeGet({ query: { url, format: 'json' } });
      return data;
    }),
  );

  // 3. Ask a question grounded in all of them
  const combinedText = articles
    .map((a) => `${a.title}\n\n${a.html}`)
    .join('\n\n---\n\n');

  const { data: answer } = await articleQa({
    body: {
      article: combinedText,
      question: `Summarise the state of ${topic} in bullet points.`,
      chatModel: { providerId: 'groq', key: 'llama-3.3-70b-versatile' },
    },
  });

  return { searchResults: search.results, articles, summary: answer.content };
}

researchTopic('quantum computing applications').then((results) => {
  console.log('Research Summary:');
  console.log(results.summary);
});
```

Every function returns `{ data, error, request, response }` and **does not
throw** by default — read `error`, or pass `throwOnError: true`.

---


## API Endpoints

The full, current surface is the generated SDK itself — 85 typed functions, one
per operation in [`qwksearch-openapi.json`](./qwksearch-openapi.json), which
this package also exports:

```javascript
import spec from 'qwksearch-api-client/openapi.json';
```

Browse it rendered at [qwksearch.com/api/docs](https://qwksearch.com/api/docs),
or by area:

| Area | Functions |
| --- | --- |
| Agent | `agentChat`, `agentSearch`, `articleQa`, `articleFollowups`, `generateSuggestions`, `discoverContent`, `rewriteText`, `autocomplete` |
| Chats | `listChats`, `getChatById`, `searchChats`, `saveMessage`, `shareChat`, `deleteChatById`, `deleteAllChats` |
| Documents | `listDocuments`, `createDocument`, `getDocumentById`, `updateDocument`, `deleteDocument`, `shareDocument`, `getSharedDocument` |
| Articles & quotes | `getArticle`, `updateArticle`, `listQuotes`, `createQuote`, `updateQuote`, `deleteQuote`, `listFavorites`, `addFavorite`, `removeFavorite` |
| Files | `uploadFiles`, `getUploadedFile`, `deleteUploadedFile`, `getUserStorage` |
| Voice | `transcribeAudio`, `textToSpeech` |
| Config & models | `getConfig`, `saveConfig`, `listProviders`, `addProvider`, `updateProvider`, `deleteProvider`, `addProviderModel`, `deleteProviderModel`, `testModels` |
| MCP | `listMcpServers`, `addMcpServer`, `updateMcpServer`, `toggleMcpServer`, `deleteMcpServer` |
| Search & scraping | `agentSearch`, `listSearchEngines`, `getEngineStatus`, `updateEngineStatus`, `testSearchEngines`, `scrapeGet`, `scrapePost` |
| Google Docs / Drive | `googleDocsAuth`, `googleDocsAuthStatus`, `googleDocsCallback`, `exportToGoogleDocs`, `importFromGoogleDocs`, `getGoogleDriveFile`, `shareGoogleDoc`, `getGoogleToken`, `refreshGoogleToken` |
| NotebookLM | `notebooklmLogin`, `getNotebooklmStatus`, `disconnectNotebooklm`, `listNotebooks`, `createNotebook`, `deleteNotebook`, `askNotebook`, `listNotebookSources`, `addNotebookSource`, `generateNotebookAudio` |
| Accounts | `getUser`, `updateUser`, `deleteUser`, `deleteUserAccount`, `changePassword`, `listSessions`, `revokeSession`, `revokeOtherSessions`, `listUserAccounts` |

### Removed in 1.0: `extractContent`, `writeLanguage`, `searchWeb`

The 0.x client wrapped three endpoints — `/extract`, `/agents` and `/search`.
All three are gone from the API, and so are those three functions. `/agents`
in particular now answers **501** and says so. Replace them with:

| 0.x | Use instead |
| --- | --- |
| `searchWeb({ query: { q } })` | `agentSearch({ query: { q } })` |
| `extractContent({ query: { url } })` | `scrapeGet({ query: { url } })` |
| `writeLanguage({ body: { agent: 'question', article } })` | `articleQa({ body: { article, question } })` |
| `writeLanguage({ body: { agent: 'summarize-bullets', article } })` | `articleQa({ body: { article, question: 'Summarise this in bullet points.' } })` |
| anything conversational | `agentChat` (server-sent events) |

Importing a removed function is not a runtime error — it is `undefined` until
you call it, and bundlers only warn. Check against the table above.

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
