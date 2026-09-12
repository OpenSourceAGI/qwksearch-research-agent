-- QwkSearch feature tables on Cloudflare D1.
-- Idempotent: safe to run against the existing `qwksearch-new` database, where
-- these tables already exist from the qwksearch-web migrations.

CREATE TABLE IF NOT EXISTS "favorites" (
  "id" integer PRIMARY KEY,
  "userId" text NOT NULL,
  "url" text NOT NULL,
  "title" text,
  "cite" text,
  "author" text,
  "author_cite" text,
  "date" text,
  "source" text,
  "word_count" integer,
  "html" text,
  "createdAt" integer NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS "idx_favorites_userId" ON "favorites" ("userId");

CREATE TABLE IF NOT EXISTS "articleCache" (
  "id" integer PRIMARY KEY,
  "url" text NOT NULL UNIQUE,
  "title" text,
  "cite" text,
  "author" text,
  "author_cite" text,
  "author_short" text,
  "author_type" text,
  "date" text,
  "source" text,
  "word_count" integer,
  "html" text,
  "followUpQuestions" text DEFAULT '[]',
  "hitCount" integer NOT NULL DEFAULT 0,
  "lastAccessed" integer NOT NULL DEFAULT (unixepoch()),
  "createdAt" integer NOT NULL DEFAULT (unixepoch()),
  "expiresAt" integer
);

CREATE TABLE IF NOT EXISTS "articleQA" (
  "id" integer PRIMARY KEY,
  "articleUrl" text NOT NULL REFERENCES "articleCache"("url"),
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "createdAt" integer NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS "idx_articleQA_articleUrl" ON "articleQA" ("articleUrl");

CREATE TABLE IF NOT EXISTS "documents" (
  "id" integer PRIMARY KEY AUTOINCREMENT,
  "name" text NOT NULL,
  "title" text,
  "content" text DEFAULT '',
  "parentId" integer REFERENCES "documents"("id") ON DELETE CASCADE,
  "isExpanded" integer DEFAULT 0,
  "isFolder" integer DEFAULT 0,
  "type" integer DEFAULT 0,
  "summary" text,
  "cite" text,
  "author" text,
  "html" text,
  "url" text,
  "createdAt" text NOT NULL,
  "updatedAt" text NOT NULL,
  "userId" text,
  "metadata" text,
  "sharing" text
);
CREATE INDEX IF NOT EXISTS "idx_documents_parentId" ON "documents" ("parentId");
CREATE INDEX IF NOT EXISTS "idx_documents_userId" ON "documents" ("userId");
CREATE INDEX IF NOT EXISTS "idx_documents_createdAt" ON "documents" ("createdAt");

CREATE TABLE IF NOT EXISTS "google_docs_sync" (
  "id" integer PRIMARY KEY AUTOINCREMENT,
  "documentId" text NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "googleDocId" text NOT NULL,
  "lastSyncedAt" text NOT NULL,
  "userId" text,
  UNIQUE ("documentId", "googleDocId")
);
CREATE INDEX IF NOT EXISTS "idx_google_docs_sync_documentId" ON "google_docs_sync" ("documentId");
CREATE INDEX IF NOT EXISTS "idx_google_docs_sync_googleDocId" ON "google_docs_sync" ("googleDocId");

CREATE TABLE IF NOT EXISTS "research_quotes" (
  "id" text PRIMARY KEY,
  "documentId" text NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "source" text,
  "author" text,
  "url" text,
  "pageNumber" text,
  "tags" text,
  "createdAt" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_research_quotes_documentId" ON "research_quotes" ("documentId");
CREATE INDEX IF NOT EXISTS "idx_research_quotes_tags" ON "research_quotes" ("tags");

CREATE TABLE IF NOT EXISTS "share_tokens" (
  "id" text PRIMARY KEY,
  "documentId" text NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "createdAt" text NOT NULL,
  "expiresAt" text
);
CREATE INDEX IF NOT EXISTS "idx_share_tokens_documentId" ON "share_tokens" ("documentId");
