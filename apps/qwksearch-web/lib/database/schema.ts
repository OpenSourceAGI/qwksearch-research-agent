import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey(),
  role: text("type", { enum: ["assistant", "user", "source", "suggestion"] }).notNull(),
  chatId: text("chatId").notNull(),
  userId: text("userId"),
  createdAt: text("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  messageId: text("messageId").notNull(),

  content: text("content"),

  sources: text("sources", {
    mode: "json",
  })
    .$type<any[]>()
    .default(sql`'[]'`),

  suggestions: text("suggestions", {
    mode: "json",
  })
    .$type<string[]>()
    .default(sql`'[]'`),
});

interface File {
  name: string;
  fileId: string;
}

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: text("createdAt").notNull(),
  focusMode: text("focusMode").notNull(),
  userId: text("userId"),
  files: text("files", { mode: "json" })
    .$type<File[]>()
    .default(sql`'[]'`),
  thinkingTimeLimit: integer("thinkingTimeLimit").default(0),
  isPublic: integer("isPublic", { mode: "boolean" }).default(0),
});

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", {
    mode: "boolean",
  }).notNull(),
  image: text("image"),
  trialAllowed: integer("trial_allowed").notNull().default(6),
  apiKey: text("api_key"),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  url: text("url").notNull(),
  title: text("title"),
  cite: text("cite"),
  author: text("author"),
  author_cite: text("author_cite"),
  date: text("date"),
  source: text("source"),
  word_count: integer("word_count"),
  html: text("html"),
  createdAt: integer("createdAt", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const articleCache = sqliteTable("articleCache", {
  id: integer("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title"),
  cite: text("cite"),
  author: text("author"),
  author_cite: text("author_cite"),
  author_short: text("author_short"),
  author_type: text("author_type"),
  date: text("date"),
  source: text("source"),
  word_count: integer("word_count"),
  html: text("html"),
  followUpQuestions: text("followUpQuestions", {
    mode: "json",
  })
    .$type<string[]>()
    .default(sql`'[]'`),
  hitCount: integer("hitCount").notNull().default(0),
  lastAccessed: integer("lastAccessed", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer("createdAt", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer("expiresAt", {
    mode: "timestamp",
  }),
});

export const articleQA = sqliteTable("articleQA", {
  id: integer("id").primaryKey(),
  articleUrl: text("articleUrl")
    .notNull()
    .references(() => articleCache.url),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: integer("createdAt", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const documents = sqliteTable(
  "documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    title: text("title"),
    content: text("content").default(""),
    parentId: integer("parentId").references((): any => documents.id, {
      onDelete: "cascade",
    }),
    isExpanded: integer("isExpanded").default(0),
    isFolder: integer("isFolder").default(0),
    type: integer("type").default(0),
    summary: text("summary"),
    cite: text("cite"),
    author: text("author"),
    html: text("html"),
    url: text("url"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    userId: text("userId"),
    metadata: text("metadata"),
    sharing: text("sharing"),
  },
  (table) => {
    return {
      parentIdIdx: index("idx_documents_parentId").on(table.parentId),
      userIdIdx: index("idx_documents_userId").on(table.userId),
      createdAtIdx: index("idx_documents_createdAt").on(table.createdAt),
    };
  },
);

export const googleDocsSync = sqliteTable(
  "google_docs_sync",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    googleDocId: text("googleDocId").notNull(),
    lastSyncedAt: text("lastSyncedAt").notNull(),
    userId: text("userId"),
  },
  (table) => {
    return {
      documentIdIdx: index("idx_google_docs_sync_documentId").on(
        table.documentId,
      ),
      googleDocIdIdx: index("idx_google_docs_sync_googleDocId").on(
        table.googleDocId,
      ),
      uniqueDoc: unique().on(table.documentId, table.googleDocId),
    };
  },
);

export const researchQuotes = sqliteTable(
  "research_quotes",
  {
    id: text("id").primaryKey(),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    source: text("source"),
    author: text("author"),
    url: text("url"),
    pageNumber: text("pageNumber"),
    tags: text("tags"),
    createdAt: text("createdAt").notNull(),
  },
  (table) => {
    return {
      documentIdIdx: index("idx_research_quotes_documentId").on(
        table.documentId,
      ),
      tagsIdx: index("idx_research_quotes_tags").on(table.tags),
    };
  },
);

export const shareTokens = sqliteTable(
  "share_tokens",
  {
    id: text("id").primaryKey(),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: text("createdAt").notNull(),
    expiresAt: text("expiresAt"),
  },
  (table) => {
    return {
      documentIdIdx: index("idx_share_tokens_documentId").on(table.documentId),
    };
  },
);

// Export Document type from documents table
export type Document = typeof documents.$inferSelect;
