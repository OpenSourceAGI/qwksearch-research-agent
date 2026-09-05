/**
 * Per-user article favorites (`/api/doc/favorites`), keyed by the LobeHub user id.
 */
import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { getQwkDB } from '../../qwksearch/db';
import { favorites } from '../../qwksearch/schema';
import { requireUserId, UnauthorizedError, unauthorizedResponse } from '../../qwksearch/session';

export const favoritesApp = new Hono();

const handle = async (fn: () => Promise<Response>): Promise<Response> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[qwksearch] favorites error:', error);
    return Response.json({ message: 'An error has occurred.' }, { status: 500 });
  }
};

favoritesApp.get('/api/doc/favorites', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    const rows = await getQwkDB()
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return Response.json({ favorites: rows });
  }),
);

favoritesApp.post('/api/doc/favorites', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    const body = (await c.req.json()) as Partial<typeof favorites.$inferInsert>;
    if (!body.url) return Response.json({ message: 'URL is required' }, { status: 400 });

    const db = getQwkDB();
    const [existing] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.url, body.url)))
      .limit(1);

    if (existing) {
      return Response.json({ favorite: existing, message: 'Article already favorited' });
    }

    const [created] = await db
      .insert(favorites)
      .values({
        author: body.author,
        author_cite: body.author_cite,
        cite: body.cite,
        date: body.date,
        html: body.html,
        source: body.source,
        title: body.title,
        url: body.url,
        userId,
        word_count: body.word_count,
      })
      .returning();

    return Response.json({ favorite: created, message: 'Favorite added' }, { status: 201 });
  }),
);

favoritesApp.delete('/api/doc/favorites', (c) =>
  handle(async () => {
    const userId = await requireUserId(c.req.raw.headers);
    const url = c.req.query('url');
    if (!url) return Response.json({ message: 'URL parameter is required' }, { status: 400 });

    await getQwkDB()
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.url, url)));

    return Response.json({ message: 'Favorite removed' });
  }),
);
