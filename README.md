<p align="center">
    <img width="300px" src="https://i.imgur.com/FfEdQbK.png" />
<br />
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
<br />
<h3 align="center">
    <a href="https://qwksearch.com"> 🚀 App</a>
    <a href="https://airesearch.js.org"> 📑 Docs </a> <a href="https://qwksearch.com/api/docs"> 🎯 API </a>
 </h3>
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
# Import Self-Hosted API
bun i ai-research-agent
```

```bash
# Import API Client
bun i qwksearch-api-client
```

![image](https://i.imgur.com/R2ARMyq.png)

<img src="https://github.com/TutteInstitute/datamapplot/raw/main/examples/ArXiv_example.gif" width="800px"/>

## 🤖🔎 STREAM: Search with Top Result Extraction & Answer Model

<p align="center">
    <img width="350px" src="https://i.imgur.com//LJ5hBjh.png" /> 
</p>

**Reimagine The Web as Self-Organizing Mind Map**

- 🔍 **Web Search** - 100+ popular sites search across 10 categories: Web Search, Academic, Videos, Images, Files, News, etc
- 📝 **Article Preview** - Extract, format with APA cite, and summarize articles, PDFs, Youtube, and URLs before reading them
- 🤖 **Choice of Language Model** -  Claude, GPT, Gemini, Grok, Llama, Chinese LLMs, etc
- 📄 **File Upload Support** - Ask questions about PDFs, URLs, DOCX, Google Docs, and Youtube
- 📚 **Search History** - All searches saved with memories, except for privacy mode
- ❓ **Follow-up Questions** - Generate follow-up questions to ask language models

## REASON Writing Agent

#### Research Editor for Annotated Summaries in Outline Notation

<p align="center">
    <img width="400px" src="https://i.imgur.com/pDvMC1Q.png" />
</p>

- 📝 **Complex Rich Text Editor**: full featured alternative to Google Docs based on Meta's Lexical with easy minimalist UI
- 📂 **Nested Document Tree**: organize research notes with a nested document organizer with drag-and-drop, tabs, and custom storage sources
- 🖱️ **Context Menu**: right-click to access quick actions for seamless document management
- 🔍 **Full-Text Search**: instantly find documents by title or content with full-text search
- ✨ **AI Rewriting**: leverage AI to rewrite and improve your text directly within the editor
- 👥 **Team Management**: collaborate with team members and manage access rights
- 🔄 **View Modes**: switch between Formatted, parsing HTML, and Markdown views for versatile editing
- 🛠️ **Find & Replace**: powerful search and replace functionality with match highlighting
- 📥 **Google Docs Integration**: seamless export, import, and sharing capabilities
- 💾 **Persistent Storage**: reliable SQLite storage ensures your data is safe and accessible
- ⌨️ **Keyboard Navigation**: efficient keyboard shortcuts for power users
- 💬 **Research Quotes**: capture and organize key quotes and insights from your research
- 🏗️ **Built with**: [Claude Code](https://claude.com/code), [Lexical Editor](https://lexical.dev/), [shadcn/ui](https://ui.shadcn.com/docs/components), [Cloudflare](https://developers.cloudflare.com/), [Next.js](https://nextjs.org/docs/app/getting-started), [Google Docs API](https://developers.google.com/workspace/docs/api/how-tos/overview)

### 🚜📜 Tractor the Text Extractor

<p align="center">
<img width="350px"  src="https://i.imgur.com/TrF7dYz.png" /> 
</p>

1. **Main Content Detection**: Extract the main content from a URL by combining Mozilla Readability and Postlight Mercury algorithms, utilizing over 100 custom adapters for major sites for article, author, date HTML classes.
2. **YouTube Transcript Processing**: When a YouTube video URL is detected, retrieve the complete video transcript including both manual captions and auto-generated subtitles, maintaining proper timestamp synchronization.
3. **PDF to HTML**: Extracts formatted text from PDF with parsing of linebreaks , page headers, footnotes, and section headings. Supports fonts, links, bold, italics, lists, headings, headers, footnotes, and Table of Contents, Quotes, and Code Blocks. Removes repeated headers, links footnote anchors to the footnote, and preserves number of the PDF page with invisible I element. This function uses [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless) to work in more environments than PDF.js-based tools: Cloudflare workers, serverless, node.js, and front-end only.
4. **Basic HTML Standardization**: Transform complex HTML into a simplified reading-mode format of basic HTML, making it ideal for research note archival and focused reading, with headings, images and links.
5. **Cite**: Identify and extract citation metadata including author names, publication dates, sources, and titles using HTML meta tags and common class name patterns. The system validates author names against a comprehensive database of 90,000 first and last names, distinguishing between personal and organizational authors to properly format citations.

## 🖥️ Desktop App

**QwkSearch Desktop** — Built with Tauri. Select any text on screen, press `` ` `` to instantly search the web without leaving your workflow.

## 🧩 Browser Extension

**QwkSearch Tab Manager AI** — AI-powered tab manager that organizes, searches, and manages browser tabs intelligently.

## Further Research

- [ThoughtSource Reasoning Datasets](https://github.com/OpenBioLink/ThoughtSource)
- [Awesome-LLMs-Datasets](https://github.com/lmmlzn/Awesome-LLMs-Datasets)
- [GPT Researcher](https://github.com/assafelovic/gpt-researcher)
- [NLP Papers Latest Updates](https://index.quantumstat.com)
- [Anthropic Persuasion Overview](https://www.anthropic.com/research/measuring-model-persuasiveness)
- [NLP Research Progress](https://github.com/sebastianruder/NLP-progress/)
- [NLP Datasets](https://github.com/niderhoff/nlp-datasets?tab=readme-ov-file)
- [Google Search Algorithm](https://searchengineland.com/google-search-document-leak-ranking-442617)
- [Can LLMs Generate Novel Research Ideas?](https://arxiv.org/html/2409.04109v1)
- [Graph Algorithms Playground](https://playground.memgraph.com)
- [CommonCrawl C4 Download](https://huggingface.co/datasets/allenai/c4)
- [Knowledge Graphs Prompts Papers](https://github.com/zjunlp/PromptKG)
- [Paper - Iterative Research Idea Generation](https://arxiv.org/abs/2404.07738)
- [Open Deep Search](https://arxiv.org/html/2503.20201v1)
- [LangChain Hub](https://smith.langchain.com/hub)

🌟 Star this repo so it will grow new features!

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
