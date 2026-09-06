/**
 * REASON documents API (`/api/doc/documents`) on D1.
 *
 * Same contract as the qwksearch-web routes so the REASON editor's document
 * sync keeps working, but ownership is the LobeHub session. Anonymous rows
 * (`userId IS NULL`) remain readable for local-storage mode compatibility.
 */
import { desc, eq, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';

import { getQwkDB } from '../../qwksearch/db';
import { documents } from '../../qwksearch/schema';
import { getUserId } from '../../qwksearch/session';

export const documentsApp = new Hono();

/** Document ids are numeric; anything else (including a missing param) is rejected as a 400. */
const parseId = (raw: string | undefined) => {
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
};

documentsApp.get('/api/doc/documents', async (c) => {
  try {
    const userId = await getUserId(c.req.raw.headers);
    const rows = await getQwkDB()
      .select()
      .from(documents)
      .where(userId ? eq(documents.userId, userId) : isNull(documents.userId))
      .orderBy(desc(documents.updatedAt));

    return c.json(rows);
  } catch (error) {
    console.error('[qwksearch] list documents failed:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

documentsApp.post('/api/doc/documents', async (c) => {
  try {
    const userId = await getUserId(c.req.raw.headers);
    const body = (await c.req.json()) as {
      content?: string;
      isFolder?: boolean;
      metadata?: unknown;
      name?: string;
      parentId?: number | null;
      title?: string;
    };
    const now = new Date().toISOString();

    const [created] = await getQwkDB()
      .insert(documents)
      .values({
        content: body.content || '',
        createdAt: now,
        isExpanded: body.isFolder ? 1 : 0,
        isFolder: body.isFolder ? 1 : 0,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        name: body.name || body.title || 'Untitled',
        parentId: body.parentId ?? null,
        title: body.title || 'Untitled',
        type: 0,
        updatedAt: now,
        userId,
      })
      .returning();

    return c.json(created);
  } catch (error) {
    console.error('[qwksearch] create document failed:', error);
    return c.json({ error: 'Failed to create document' }, 500);
  }
});

const loadOwnedDocument = async (c: Context) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return { error: c.json({ error: 'Invalid document id' }, 400) };

  const userId = await getUserId(c.req.raw.headers);
  const [doc] = await getQwkDB().select().from(documents).where(eq(documents.id, id)).limit(1);

  if (!doc) return { error: c.json({ error: 'Document not found' }, 404) };
  if (doc.userId && doc.userId !== userId) return { error: c.json({ error: 'Unauthorized' }, 403) };

  return { doc, id };
};

documentsApp.get('/api/doc/documents/:id', async (c) => {
  try {
    const result = await loadOwnedDocument(c);
    if ('error' in result) return result.error;
    return c.json(result.doc);
  } catch (error) {
    console.error('[qwksearch] get document failed:', error);
    return c.json({ error: 'Failed to fetch document' }, 500);
  }
});

documentsApp.put('/api/doc/documents/:id', async (c) => {
  try {
    const result = await loadOwnedDocument(c);
    if ('error' in result) return result.error;

    const body = (await c.req.json()) as Record<string, unknown>;
    const update: Partial<typeof documents.$inferInsert> = { updatedAt: new Date().toISOString() };

    if (body.title !== undefined) update.title = String(body.title);
    if (body.name !== undefined) update.name = String(body.name);
    if (body.content !== undefined) update.content = String(body.content);
    if (body.parentId !== undefined) update.parentId = body.parentId as number | null;
    if (body.isExpanded !== undefined) update.isExpanded = body.isExpanded ? 1 : 0;
    if (body.metadata !== undefined) update.metadata = JSON.stringify(body.metadata);

    const [updated] = await getQwkDB()
      .update(documents)
      .set(update)
      .where(eq(documents.id, result.id))
      .returning();

    return c.json(updated);
  } catch (error) {
    console.error('[qwksearch] update document failed:', error);
    return c.json({ error: 'Failed to update document' }, 500);
  }
});

documentsApp.delete('/api/doc/documents/:id', async (c) => {
  try {
    const result = await loadOwnedDocument(c);
    if ('error' in result) return result.error;

    await getQwkDB().delete(documents).where(eq(documents.id, result.id));
    return c.json({ success: true });
  } catch (error) {
    console.error('[qwksearch] delete document failed:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});
