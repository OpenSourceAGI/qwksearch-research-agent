/**
 * @fileoverview User favorites management. GET lists all favorited articles.
 * POST adds an article to favorites (with deduplication). DELETE removes
 * a favorite by URL. All operations require authentication.
 */
import { getDB } from '@/lib/database';
import { favorites } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/session';
import { withCors, corsPreflight } from '@/lib/cors';

// GET all favorites for the current user
const handleFavoritesGet = async (req: Request) => {
  try {
    const db = getDB();
    const userId = await requireUserId();

    const userFavorites = await db.query.favorites.findMany({
      where: eq(favorites.userId, userId),
      orderBy: (favorites, { desc }) => [desc(favorites.createdAt)],
    });

    return Response.json({ favorites: userFavorites }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    }

    console.error('Error getting favorites: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

// POST - Add a new favorite
const handleFavoritesPost = async (req: Request) => {
  try {
    const db = getDB();
    const userId = await requireUserId();
    const body = await req.json();

    const { url, title, cite, author, author_cite, date, source, word_count, html } = body;

    if (!url) {
      return Response.json(
        { message: 'URL is required' },
        { status: 400 },
      );
    }

    // Check if already favorited
    const existing = await db.query.favorites.findFirst({
      where: and(eq(favorites.userId, userId), eq(favorites.url, url)),
    });

    if (existing) {
      return Response.json(
        { message: 'Article already favorited', favorite: existing },
        { status: 200 },
      );
    }

    // Insert new favorite
    const [newFavorite] = await db
      .insert(favorites)
      .values({
        userId,
        url,
        title,
        cite,
        author,
        author_cite,
        date,
        source,
        word_count,
        html,
      })
      .returning();

    return Response.json(
      { message: 'Favorite added', favorite: newFavorite },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    }

    console.error('Error adding favorite: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

// DELETE - Remove a favorite by URL
const handleFavoritesDelete = async (req: Request) => {
  try {
    const db = getDB();
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return Response.json(
        { message: 'URL parameter is required' },
        { status: 400 },
      );
    }

    // Delete the favorite
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.url, url)));

    return Response.json(
      { message: 'Favorite removed' },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    }

    console.error('Error deleting favorite: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

export const GET = withCors(handleFavoritesGet);
export const POST = withCors(handleFavoritesPost);
export const DELETE = withCors(handleFavoritesDelete);
export const OPTIONS = corsPreflight;
