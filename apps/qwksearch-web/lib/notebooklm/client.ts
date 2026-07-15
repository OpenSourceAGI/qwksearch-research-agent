/**
 * NotebookLM API client. Interacts with NotebookLM via its internal APIs
 * using authenticated cookies obtained through the Puppeteer login flow.
 *
 * NotebookLM uses gRPC-web internally at:
 *   https://notebooklm.google.com/api/...
 *
 * We hit these endpoints with the user's auth cookies forwarded through
 * the scraper worker's session-persistent browser.
 */

import { renderUrlWithMetadata } from "../scraper/cloudflare-scraper-client";
import type { NotebookLMCredentials } from "./credentials";

const BASE_URL = "https://notebooklm.google.com";

export interface Notebook {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  sourceCount?: number;
}

export interface NotebookSource {
  id: string;
  title: string;
  type: string;
  url?: string;
  createdAt?: string;
}

export interface AskResponse {
  answer: string;
  sources?: Array<{
    sourceId: string;
    title: string;
    snippet: string;
  }>;
}

export interface NotebookLMClient {
  listNotebooks(): Promise<Notebook[]>;
  createNotebook(title: string): Promise<Notebook>;
  deleteNotebook(notebookId: string): Promise<void>;
  addSource(
    notebookId: string,
    source: { url?: string; text?: string; title?: string },
  ): Promise<NotebookSource>;
  listSources(notebookId: string): Promise<NotebookSource[]>;
  ask(notebookId: string, query: string): Promise<AskResponse>;
  generateAudio(
    notebookId: string,
    options?: { instructions?: string },
  ): Promise<{ audioUrl: string; status: string }>;
}

/**
 * Creates a NotebookLM API client that routes requests through the
 * CF Puppeteer scraper with the user's persistent session cookies.
 */
export function createNotebookLMClient(
  creds: NotebookLMCredentials,
): NotebookLMClient {
  const sessionId = `notebooklm-${creds.userId}`;

  async function apiRequest(
    path: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: unknown,
  ): Promise<any> {
    const scraperUrl =
      typeof process !== "undefined" && process?.env?.SCRAPER_URL
        ? process.env.SCRAPER_URL
        : "https://proxy.qwksearch.com";

    const targetUrl = `${BASE_URL}${path}`;

    // Use the scraper's fetch-as-session endpoint which executes requests
    // with the session's stored cookies (maintained by the Durable Object)
    const response = await fetch(`${scraperUrl}/api/fetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process?.env?.SCRAPER_API_KEY
          ? { Authorization: `Bearer ${process.env.SCRAPER_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        sessionId,
        url: targetUrl,
        method,
        body: body ? JSON.stringify(body) : undefined,
        cookies: creds.cookies,
        headers: {
          "Content-Type": "application/json",
          Origin: BASE_URL,
          Referer: `${BASE_URL}/`,
          ...creds.authHeaders,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      throw new Error(
        `NotebookLM API error (${response.status}): ${err.slice(0, 300)}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  // Alternative: scrape the NotebookLM page via the Durable Object session
  // and extract data from the rendered page's internal state
  async function pageRequest(path: string): Promise<string> {
    const result = await renderUrlWithMetadata(`${BASE_URL}${path}`, {
      sessionId,
      blockImages: true,
      waitUntil: "networkidle2",
      timeout: 20000,
    });
    return result.html;
  }

  return {
    async listNotebooks(): Promise<Notebook[]> {
      const data = await apiRequest("/api/notebooks");
      if (Array.isArray(data)) {
        return data.map((n: any) => ({
          id: n.id || n.notebookId,
          title: n.title || n.name || "Untitled",
          createdAt: n.createdAt || n.createTime,
          updatedAt: n.updatedAt || n.updateTime,
          sourceCount: n.sourceCount || n.sources?.length,
        }));
      }

      // Fallback: render the notebooks page and parse the state
      const html = await pageRequest("/");
      const notebooks = extractNotebooksFromPage(html);
      return notebooks;
    },

    async createNotebook(title: string): Promise<Notebook> {
      const data = await apiRequest("/api/notebooks", "POST", { title });
      return {
        id: data.id || data.notebookId,
        title: data.title || title,
        createdAt: data.createdAt,
      };
    },

    async deleteNotebook(notebookId: string): Promise<void> {
      await apiRequest(`/api/notebooks/${notebookId}`, "DELETE");
    },

    async addSource(
      notebookId: string,
      source: { url?: string; text?: string; title?: string },
    ): Promise<NotebookSource> {
      const data = await apiRequest(
        `/api/notebooks/${notebookId}/sources`,
        "POST",
        source,
      );
      return {
        id: data.id || data.sourceId,
        title: data.title || source.title || source.url || "Source",
        type: source.url ? "url" : "text",
        url: source.url,
        createdAt: data.createdAt,
      };
    },

    async listSources(notebookId: string): Promise<NotebookSource[]> {
      const data = await apiRequest(`/api/notebooks/${notebookId}/sources`);
      if (Array.isArray(data)) {
        return data.map((s: any) => ({
          id: s.id || s.sourceId,
          title: s.title || s.name || "Source",
          type: s.type || "unknown",
          url: s.url,
          createdAt: s.createdAt,
        }));
      }
      return [];
    },

    async ask(notebookId: string, query: string): Promise<AskResponse> {
      const data = await apiRequest(
        `/api/notebooks/${notebookId}/ask`,
        "POST",
        { query },
      );
      return {
        answer: data.answer || data.response || data.text || "",
        sources: data.sources || data.citations || [],
      };
    },

    async generateAudio(
      notebookId: string,
      options?: { instructions?: string },
    ): Promise<{ audioUrl: string; status: string }> {
      const data = await apiRequest(
        `/api/notebooks/${notebookId}/audio`,
        "POST",
        { instructions: options?.instructions },
      );
      return {
        audioUrl: data.audioUrl || data.url || "",
        status: data.status || "pending",
      };
    },
  };
}

function extractNotebooksFromPage(html: string): Notebook[] {
  const notebooks: Notebook[] = [];

  // Extract notebook data from the Angular/lit-html rendered page
  // NotebookLM embeds state in script tags or data attributes
  const stateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
  );
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const items = state.notebooks || state.projects || [];
      for (const item of items) {
        notebooks.push({
          id: item.id || item.projectId,
          title: item.title || item.name || "Untitled",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      }
    } catch {
      // Parsing failed; return empty
    }
  }

  return notebooks;
}
