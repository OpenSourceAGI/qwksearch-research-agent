/**
 * @fileoverview Article extraction and caching API. GET fetches an article
 * by URL with database caching and hit-count tracking, falling back to
 * in-process extraction via ai-research-agent. POST stores Q&A pairs and
 * follow-up questions for cached articles.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { articleCache, articleQA } from "@/lib/database/schema";
import { eq, sql } from "drizzle-orm";
import { extractContent } from "extract-webpage";

interface Article {
  html?: string;
  cite?: string;
  title?: string;
  url?: string;
  author?: string;
  author_cite?: string;
  author_short?: string;
  author_type?: string;
  date?: string;
  source?: string;
  word_count?: number;
}

interface CachedArticle extends Article {
  followUpQuestions?: string[];
  qaHistory?: Array<{ question: string; answer: string }>;
}

// GET /api/article?url=... - Get article with cache
export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 },
      );
    }

    // Reject malformed URLs and search-engine result pages — these are never
    // extractable as articles and shouldn't hit the cache layer.
    const searchEnginePatterns = [
      /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
      /^https?:\/\/(www\.)?bing\.com\/search/i,
      /^https?:\/\/(www\.)?duckduckgo\.com\/\?/i,
    ];
    if (/\s/.test(url) || searchEnginePatterns.some((p) => p.test(url))) {
      return NextResponse.json(
        { error: "URL is not an extractable article" },
        { status: 400 },
      );
    }

    // Check for video URLs that can't be extracted as articles
    // Note: YouTube is allowed and handled by the extraction API
    const videoPatterns = [
      /vimeo\.com\//i,
      /dailymotion\.com\/video/i,
      /twitch\.tv\//i,
    ];

    const isVideoUrl = videoPatterns.some((pattern) => pattern.test(url));
    if (isVideoUrl) {
      return NextResponse.json({
        cached: false,
        article: {
          url,
          title: "Video Content",
          html: "<p>This is a video URL. Article extraction is not available for video content.</p>",
          source: new URL(url).hostname,
          followUpQuestions: [],
          qaHistory: [],
        },
        isVideo: true,
      });
    }

    // Check cache first
    const cached = await db
      .select()
      .from(articleCache)
      .where(eq(articleCache.url, url))
      .limit(1);

    if (cached.length > 0 && cached[0].html) {
      const cachedArticle = cached[0];

      // Update hit count and last accessed
      await db
        .update(articleCache)
        .set({
          hitCount: sql`${articleCache.hitCount} + 1`,
          lastAccessed: sql`(unixepoch())`,
        })
        .where(eq(articleCache.url, url));

      // Get Q&A history
      const qaHistory = await db
        .select({
          question: articleQA.question,
          answer: articleQA.answer,
        })
        .from(articleQA)
        .where(eq(articleQA.articleUrl, url));

      const response: CachedArticle = {
        url: cachedArticle.url,
        title: cachedArticle.title || undefined,
        cite: cachedArticle.cite || undefined,
        author: cachedArticle.author || undefined,
        author_cite: cachedArticle.author_cite || undefined,
        author_short: cachedArticle.author_short || undefined,
        author_type: cachedArticle.author_type || undefined,
        date: cachedArticle.date || undefined,
        source: cachedArticle.source || undefined,
        word_count: cachedArticle.word_count || undefined,
        html: cachedArticle.html || undefined,
        followUpQuestions: cachedArticle.followUpQuestions as string[],
        qaHistory: qaHistory,
      };

      return NextResponse.json({
        cached: true,
        article: response,
      });
    }

    // If not in cache (or cached row was empty), extract in-process
    const extracted = await extractContent(url);
    const article: Article = extracted as Article;

    if (!article || !article.html || (extracted as { error?: unknown }).error) {
      return NextResponse.json(
        {
          error: "Article extraction returned no content",
          url,
          detail: (extracted as { error?: unknown }).error,
        },
        { status: 502 },
      );
    }

    // Upsert: replace any prior empty row so we don't keep poisoning future reads
    const values = {
      url,
      title: article.title || null,
      cite: article.cite || null,
      author: article.author || null,
      author_cite: article.author_cite || null,
      author_short: article.author_short || null,
      author_type: article.author_type || null,
      date: article.date || null,
      source: article.source || null,
      word_count: article.word_count || null,
      html: article.html,
      followUpQuestions: [],
      hitCount: 1,
    };

    if (cached.length > 0) {
      await db.update(articleCache).set(values).where(eq(articleCache.url, url));
    } else {
      await db.insert(articleCache).values(values);
    }

    return NextResponse.json({
      cached: false,
      article: {
        ...article,
        followUpQuestions: [],
        qaHistory: [],
      },
    });
  } catch (error) {
    const err = error as Error & { cause?: unknown };
    console.error("Error fetching article:", {
      message: err?.message,
      cause: err?.cause,
      stack: err?.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    );
  }
}

// POST /api/article - Store Q&A or update follow-up questions
export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const body = await req.json();
    const { url, question, answer, followUpQuestions } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // If storing Q&A pair
    if (question && answer) {
      await db.insert(articleQA).values({
        articleUrl: url,
        question,
        answer,
      });
    }

    // If updating follow-up questions
    if (followUpQuestions && Array.isArray(followUpQuestions)) {
      await db
        .update(articleCache)
        .set({
          followUpQuestions: followUpQuestions,
        })
        .where(eq(articleCache.url, url));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error & { cause?: unknown };
    console.error("Error storing article data:", {
      message: err?.message,
      cause: err?.cause,
      stack: err?.stack,
    });
    return NextResponse.json(
      { error: "Failed to store article data" },
      { status: 500 },
    );
  }
}
