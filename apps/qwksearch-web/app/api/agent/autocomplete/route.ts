/**
 * @fileoverview Query autocomplete endpoint. GET fans out to one or more
 * search-engine suggest APIs and returns a deduplicated list of suggestions.
 */
import { NextRequest, NextResponse } from "next/server";
import { searchAutocompleteMulti } from "extract-webpage/suggest-next-words/autocomplete-search-engines";

const DEFAULT_BACKENDS = ["google", "duckduckgo", "wikipedia"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const locale = searchParams.get("locale") || "en-US";
  const backendsParam = searchParams.get("backends");
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (!query) return NextResponse.json({ suggestions: [] });

  const backends = backendsParam
    ? backendsParam.split(",").map((b) => b.trim()).filter(Boolean)
    : DEFAULT_BACKENDS;

  try {
    const suggestions = await searchAutocompleteMulti(backends, query, locale);
    return NextResponse.json({ suggestions: suggestions.slice(0, limit) });
  } catch (err) {
    console.error("Autocomplete error:", err);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
