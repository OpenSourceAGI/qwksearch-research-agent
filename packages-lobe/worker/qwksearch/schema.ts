/**
 * QwkSearch feature tables, kept on Cloudflare D1 (SQLite).
 *
 * LobeHub owns users, sessions, chats and agents in Postgres. These tables hold
 * the QwkSearch-specific features layered on top: the article extract side
 * panel cache, per-user favorites, REASON documents, research quotes and share
 * tokens. `userId` columns store the LobeHub Better Auth user id; there is no
 * cross-database foreign key.
 *
 * Mirrors `apps/qwksearch-web/lib/database/schema.ts` so the existing
 * `qwksearch-new` D1 database (and its data) can be reused as-is.
 */
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const favorites = sqliteTable('favorites', {
  author: text('author'),
  author_cite: text('author_cite'),
  cite: text('cite'),
  createdAt: integer('createdAt', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  date: text('date'),
  html: text('html'),
  id: integer('id').primaryKey(),
  source: text('source'),
  title: text('title'),
  url: text('url').notNull(),
  userId: text('userId').notNull(),
  word_count: integer('word_count'),
});

export const articleCache = sqliteTable('articleCache', {
  author: text('author'),
  author_cite: text('author_cite'),
  author_short: text('author_short'),
  author_type: text('author_type'),
  cite: text('cite'),
  createdAt: integer('createdAt', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  date: text('date'),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  followUpQuestions: text('followUpQuestions', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'[]'`),
  hitCount: integer('hitCount').notNull().default(0),
  html: text('html'),
  id: integer('id').primaryKey(),
  lastAccessed: integer('lastAccessed', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  source: text('source'),
  title: text('title'),
  url: text('url').notNull().unique(),
  word_count: integer('word_count'),
});

export const articleQA = sqliteTable('articleQA', {
  answer: text('answer').notNull(),
  articleUrl: text('articleUrl')
    .notNull()
    .references(() => articleCache.url),
  createdAt: integer('createdAt', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  id: integer('id').primaryKey(),
  question: text('question').notNull(),
});

export const documents = sqliteTable(
  'documents',
  {
    author: text('author'),
    cite: text('cite'),
    content: text('content').default(''),
    createdAt: text('createdAt').notNull(),
    html: text('html'),
    id: integer('id').primaryKey({ autoIncrement: true }),
    isExpanded: integer('isExpanded').default(0),
    isFolder: integer('isFolder').default(0),
    metadata: text('metadata'),
    name: text('name').notNull(),
    parentId: integer('parentId').references((): any => documents.id, { onDelete: 'cascade' }),
    sharing: text('sharing'),
    summary: text('summary'),
    title: text('title'),
    type: integer('type').default(0),
    updatedAt: text('updatedAt').notNull(),
    url: text('url'),
    userId: text('userId'),
  },
  (table) => [
    index('idx_documents_parentId').on(table.parentId),
    index('idx_documents_userId').on(table.userId),
    index('idx_documents_createdAt').on(table.createdAt),
  ],
);

export const googleDocsSync = sqliteTable(
  'google_docs_sync',
  {
    documentId: text('documentId')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    googleDocId: text('googleDocId').notNull(),
    id: integer('id').primaryKey({ autoIncrement: true }),
    lastSyncedAt: text('lastSyncedAt').notNull(),
    userId: text('userId'),
  },
  (table) => [
    index('idx_google_docs_sync_documentId').on(table.documentId),
    index('idx_google_docs_sync_googleDocId').on(table.googleDocId),
    unique().on(table.documentId, table.googleDocId),
  ],
);

export const researchQuotes = sqliteTable(
  'research_quotes',
  {
    author: text('author'),
    createdAt: text('createdAt').notNull(),
    documentId: text('documentId')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    id: text('id').primaryKey(),
    pageNumber: text('pageNumber'),
    source: text('source'),
    tags: text('tags'),
    text: text('text').notNull(),
    url: text('url'),
  },
  (table) => [
    index('idx_research_quotes_documentId').on(table.documentId),
    index('idx_research_quotes_tags').on(table.tags),
  ],
);

export const shareTokens = sqliteTable(
  'share_tokens',
  {
    createdAt: text('createdAt').notNull(),
    documentId: text('documentId')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    expiresAt: text('expiresAt'),
    id: text('id').primaryKey(),
  },
  (table) => [index('idx_share_tokens_documentId').on(table.documentId)],
);
