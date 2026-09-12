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
import {
  buildCite,
  classifyUrl,
  extractArticle,
  type ExtractedArticle,
  isExtractableKind,
  tiersForUrl,
} from '../../qwksearch/extract';
import { userExtractionOverridesForRequest } from '../../qwksearch/extractionPreferences';
import {
  type CitationStyle,
  parseClientExtractionOverrides,
  resolveExtractionSettings,
} from '../../qwksearch/extractSettings';
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

/**
 * Re-render a cached article's citation in the requested style.
 *
 * `articleCache` is keyed by URL alone and stores one `cite` string, written in
 * whatever style produced it. Rather than fragmenting the cache per style, the
 * response rebuilds the citation from the fields that *are* cached whenever a
 * non-APA style is asked for. APA keeps the stored string, because that one
 * came out of the extractor's name database and is better than anything the
 * fallback builder can assemble from the columns.
 */
export const restyleCite = (article: CachedArticle, style: CitationStyle): CachedArticle =>
  style === 'apa' ? article : { ...article, cite: buildCite(article, article.url || '', style) };

export const articleApp = new Hono();

articleApp.get('/api/doc/article', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'URL parameter is required' }, 400);

  const kind = classifyUrl(url);

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

  // Everything still standing goes through the chain: `article`, and also
  // `youtube` and `pdf`, which `tiersForUrl` routes to `extract-youtube` and
  // `extract-pdf`. Asking the predicate rather than listing the refused kinds
  // means a kind added later cannot silently fall into extraction.
  if (!isExtractableKind(kind)) {
    return c.json({ error: 'URL is not an extractable article' }, 400);
  }

  // Operator config (Worker vars and secrets), narrowed by the signed-in user's
  // saved preferences, then by the two request parameters that are safe to
  // honour: `cite` and `lang`. Hosts, keys and the PDF OCR mode are deliberately
  // not readable from the query string — see the module comment in
  // `extractSettings.ts`. The user layer resolves to `{}` for anonymous callers,
  // which is why this route still serves them.
  const settings = resolveExtractionSettings(
    process.env as Record<string, string | undefined>,
    await userExtractionOverridesForRequest(c.req.raw.headers),
    parseClientExtractionOverrides((name) => c.req.query(name)),
  );

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

      return c.json({
        article: {
          ...restyleCite(toResponseArticle(cached[0]), settings.citationStyle),
          qaHistory,
        },
        cached: true,
      });
    }

    const extracted = await extractArticle(url, tiersForUrl(url, kind, settings));
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
