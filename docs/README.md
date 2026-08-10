## Overview
QwkSearch is a comprehensive research tool that reimagines the internet as a self-organizing mind map. It combines advanced web search capabilities with AI-powered research assistance, allowing users to:

- Search across 100+ websites and 10 categories (web, academic, news, etc)
- Extract content from PDFs, YouTube, and URLs
- Use multiple LLMs (Claude, GPT, Gemini, etc)
- Export cited answers with APA formatting

## Key Features

| Feature | Description |
|--------|-------------|
| Self-hostable | Run on Cloudflare Workers or Docker |
| MCP Server Support | Integrated Messaging Control Protocol server |
| LLM Agnostic | Supports multiple language models |
| Rich Document Editor | Built with Lexical editor for annotated research |
| Citation Extraction | Automatic APA/MLA citation generation |
| Browser Extension | AI-powered tab manager |
| Desktop App | Tauri-based screenshare search tool |
| VS Code Extension | Research questions from code editor |

## Quick Setup
```bash
# Download Source
bun x git0 vtempest/qwksearch-research-agent

# Install API Client
bun i qwksearch-api-client

# Start MCP Server (if needed)
cd packages/qwksearch-mcp-server
npm run start
```