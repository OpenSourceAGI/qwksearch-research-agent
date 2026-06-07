/**
 * @fileoverview Web search proxy endpoint. GET performs a meta-search via
 * SearXNG with support for category filtering, language, safe search,
 * recency, and pagination. Falls back to public instances on empty results.
 */
import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "extract-webpage/search/public-searxng";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  const query = searchParams.get("q");
  const cat = searchParams.get("cat") || "general";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const lang = searchParams.get("lang") || "en-US";
  const safesearch = searchParams.get("safesearch") === "true";
  const recency = searchParams.get("recency") || undefined;
  const publicInstances = searchParams.get("publicInstances") === "true";

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 },
    );
  }

  const startTime = Date.now();

  // Custom domains logic (placeholders for now as per user code being adapted)
  const searxngDomain = "https://search.qwksearch.com"; // Hardcoded for now as user wanted this base
  const proxyDomain = "";

  try {
    let results = await searchWeb(query, {
      category: cat,
      recency,
      safesearch,
      maxRetries: 6,
      privateSearxng: publicInstances ? false : searxngDomain,
      proxy: proxyDomain,
      lang,
      page,
    });

    // Retry logic if no results (from user code)
    // Check if results is empty array or empty result object.
    const hasResults = Array.isArray(results)
      ? results.length > 0
      : results.results.length > 0;

    if (!hasResults) {
      // Retry with privateSearxng false
      results = await searchWeb(query, {
        category: cat,
        recency,
        safesearch,
        maxRetries: 6,
        privateSearxng: false,
        proxy: proxyDomain,
        lang,
        page,
      });
    }

    const elapsedTime = Date.now() - startTime;

    if (Array.isArray(results)) {
      return NextResponse.json({ results, elapsedTime });
    } else {
      return NextResponse.json({ ...results, elapsedTime });
    }
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 },
    );
  }
}
