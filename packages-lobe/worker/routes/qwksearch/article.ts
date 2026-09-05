/**
 * Article extract + cache API (`/api/doc/article`), ported from
 * `apps/qwksearch-web/app/api/doc/article/route.ts` to D1 + the LobeHub Worker.
 *
 * GET  /api/doc/article?url=…  → cached article (hit-count tracked) or a fresh
 *                                 extraction through the fallback chain.
 * POST /api/doc/article         → store a Q&A pair / update follow-up questions.
 */
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { getQwkDB } from '../../qwksearch/db';
import { classifyUrl, extractArticle,type ExtractedArticle } from '../../qwksearch/extract';
import { articleCache, articleQA } from '../../qwksearch/schema';

interface CachedArticle extends ExtractedArticle {
  followUpQuestions?: string[];
  qaHistory?: Array<{ answer: string; question: string }>;
}

const toResponseArticle = (row: typeof articleCache.$inferSelect): CachedArticle => ({
  author: row.author || undefined,
  author_cite: row.author_cite || undefined,
  author_short: row.author_short || undefined,
  author_type: row.author_type || undefined,
  cite: row.cite || undefined,
  date: row.date || undefined,
  followUpQuestions: (row.followUpQuestions as string[]) || [],
  html: row.html || undefined,
  source: row.source || undefined,
  title: row.title || undefined,
  url: row.url,
  word_count: row.word_count || undefined,
});

export const articleApp = new Hono();

articleApp.get('/api/doc/article', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'URL parameter is required' }, 400);

  const kind = classifyUrl(url);
  if (kind === 'invalid' || kind === 'search-engine') {
    return c.json({ error: 'URL is not an extractable article' }, 400);
  }

  if (kind === 'video') {
    return c.json({
      article: {
        followUpQuestions: [],
        html: '<p>This is a video URL. Article extraction is not available for video content.</p>',
        qaHistory: [],
        source: new URL(url).hostname,
        title: 'Video Content',
        url,
      },
      cached: false,
      isVideo: true,
    });
  }

  try {
    const db = getQwkDB();
    const cached = await db.select().from(articleCache).where(eq(articleCache.url, url)).limit(1);

    if (cached.length > 0 && cached[0].html) {
      await db
        .update(articleCache)
        .set({ hitCount: sql`${articleCache.hitCount} + 1`, lastAccessed: sql`(unixepoch())` })
        .where(eq(articleCache.url, url));

      const qaHistory = await db
        .select({ answer: articleQA.answer, question: articleQA.question })
        .from(articleQA)
        .where(eq(articleQA.articleUrl, url));

      return c.json({ article: { ...toResponseArticle(cached[0]), qaHistory }, cached: true });
    }

    const extracted = await extractArticle(url);
    if (!extracted.html || extracted.error) {
      return c.json(
        { detail: extracted.error, error: 'Article extraction returned no content', url },
        502,
      );
    }

    const values = {
      author: extracted.author || null,
      author_cite: extracted.author_cite || null,
      author_short: extracted.author_short || null,
      author_type: extracted.author_type || null,
      cite: extracted.cite || null,
      date: extracted.date || null,
      followUpQuestions: [] as string[],
      hitCount: 1,
      html: extracted.html,
      source: extracted.source || null,
      title: extracted.title || null,
      url,
      word_count: extracted.word_count || null,
    };

    if (cached.length > 0) {
      await db.update(articleCache).set(values).where(eq(articleCache.url, url));
    } else {
      await db.insert(articleCache).values(values);
    }

    return c.json({
      article: { ...extracted, followUpQuestions: [], qaHistory: [] },
      cached: false,
    });
  } catch (error) {
    console.error('[qwksearch] article fetch failed:', error);
    return c.json({ error: 'Failed to fetch article' }, 500);
  }
});

articleApp.post('/api/doc/article', async (c) => {
  try {
    const body = (await c.req.json()) as {
      answer?: string;
      followUpQuestions?: unknown;
      question?: string;
      url?: string;
    };
    const { url, question, answer, followUpQuestions } = body;
    if (!url) return c.json({ error: 'URL is required' }, 400);

    const db = getQwkDB();

    if (question && answer) {
      await db.insert(articleQA).values({ answer, articleUrl: url, question });
    }

    if (Array.isArray(followUpQuestions)) {
      await db
        .update(articleCache)
        .set({ followUpQuestions: followUpQuestions.map(String) })
        .where(eq(articleCache.url, url));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[qwksearch] article update failed:', error);
    return c.json({ error: 'Failed to store article data' }, 500);
  }
});
