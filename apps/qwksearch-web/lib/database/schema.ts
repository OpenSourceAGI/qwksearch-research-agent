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
  sizeBytes?: number;
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
  storageUsedBytes: integer("storage_used_bytes").default(0),
  storageQuotaBytes: integer("storage_quota_bytes").default(1073741824),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }).notNull(),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }).notNull(),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }),
  // Set by the better-auth Stripe plugin (lib/billing/stripe.ts) once the user
  // has paid through Checkout or a Payment Link.
  stripeCustomerId: text("stripe_customer_id"),
});

// Subscriptions tracked by the better-auth Stripe plugin. Field names match
// the plugin's model (`@better-auth/stripe` schema); `referenceId` is the
// user ID. See drizzle migration 0011_add_stripe_subscriptions.
export const subscription = sqliteTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    plan: text("plan").notNull(),
    referenceId: text("reference_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").default("incomplete"),
    periodStart: integer("period_start", { mode: "timestamp" }),
    periodEnd: integer("period_end", { mode: "timestamp" }),
    trialStart: integer("trial_start", { mode: "timestamp" }),
    trialEnd: integer("trial_end", { mode: "timestamp" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", {
      mode: "boolean",
    }).default(false),
    cancelAt: integer("cancel_at", { mode: "timestamp" }),
    canceledAt: integer("canceled_at", { mode: "timestamp" }),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    seats: integer("seats"),
    billingInterval: text("billing_interval"),
    stripeScheduleId: text("stripe_schedule_id"),
  },
  (table) => [
    index("subscription_reference_id_idx").on(table.referenceId),
    index("subscription_stripe_subscription_id_idx").on(
      table.stripeSubscriptionId,
    ),
  ],
);

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
  city: text("city"),
  state: text("state"),
  isVpn: integer("is_vpn", { mode: "boolean" }).default(false),
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

// One row per user who has requested access to a document they don't own.
// The unique constraint on (documentId, requesterUserId) is what enforces
// "only one request per user per document" — the access-request API relies
// on this to refuse a second send rather than re-checking application-side.
export const documentAccessRequests = sqliteTable(
  "document_access_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentId: integer("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    requesterUserId: text("requesterUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ownerUserId: text("ownerUserId").notNull(),
    status: text("status", { enum: ["sent", "failed"] })
      .notNull()
      .default("sent"),
    createdAt: text("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      documentIdIdx: index("idx_document_access_requests_documentId").on(
        table.documentId,
      ),
      requesterUserIdIdx: index(
        "idx_document_access_requests_requesterUserId",
      ).on(table.requesterUserId),
      uniqueRequest: unique("uq_document_access_requests_doc_requester").on(
        table.documentId,
        table.requesterUserId,
      ),
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

export const uploads = sqliteTable(
  "uploads",
  {
    fileId: text("fileId").primaryKey(),
    userId: text("userId"),
    fileName: text("fileName").notNull(),
    fileExtension: text("fileExtension").notNull(),
    size: integer("size").notNull().default(0),
    createdAt: integer("createdAt", {
      mode: "timestamp",
    })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => {
    return {
      userIdIdx: index("idx_uploads_userId").on(table.userId),
    };
  },
);

export type Upload = typeof uploads.$inferSelect;

// Export Document type from documents table
export type Document = typeof documents.$inferSelect;

export const userAgentSkills = sqliteTable("user_agent_skills", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type UserAgentSkill = typeof userAgentSkills.$inferSelect;

/**
 * Every headline the trending-news widget has fetched, kept past the ten
 * minute KV cache so the homepage has something to show when The News API is
 * down, rate-limited or unconfigured — and so the admin panel can report what
 * the widget is actually serving.
 *
 * `(topic, url)` is unique: a re-fetch of the same topic re-reports the same
 * articles, and those are updates to one row, not new rows. `fetchedAt` is
 * therefore "last seen in a fetch", which is what the read-back orders by and
 * what the retention sweep deletes on.
 */
export const newsArticles = sqliteTable(
  "news_articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    topic: text("topic").notNull(),
    /** `wikipedia_daily_top` or `custom_topics` — how the topic was chosen. */
    topicSource: text("topic_source").notNull().default("wikipedia_daily_top"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    source: text("source"),
    imageUrl: text("image_url"),
    publishedAt: text("published_at"),
    wikiRank: integer("wiki_rank"),
    wikiViews: integer("wiki_views"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    fetchedAt: integer("fetched_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => {
    return {
      topicUrlUnique: unique("news_articles_topic_url").on(
        table.topic,
        table.url,
      ),
      topicIdx: index("idx_news_articles_topic").on(table.topic),
      fetchedAtIdx: index("idx_news_articles_fetchedAt").on(table.fetchedAt),
    };
  },
);

export type NewsArticleRow = typeof newsArticles.$inferSelect;

/**
 * Site-wide control of the homepage news widget, set from the admin panel.
 *
 * One row, `id = 'global'`. It lives in D1 rather than in `lib/config` because
 * that config manager is in-memory: a value set there is lost on the next
 * Worker isolate and was never visible to the other ones. An admin toggling
 * the widget off expects it to stay off.
 */
export const newsWidgetSettings = sqliteTable("news_widget_settings", {
  id: text("id").primaryKey(),
  /** Master switch: off hides the widget for everyone, whatever a user set. */
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  /**
   * Topics served when a visitor has named none of their own. Blank means the
   * widget falls back to Wikipedia's daily trending ranking.
   */
  defaultTopics: text("default_topics").notNull().default(""),
  /** Whether visitors may override `defaultTopics` with their own list. */
  allowUserTopics: integer("allow_user_topics", { mode: "boolean" })
    .notNull()
    .default(true),
  /** Topics the widget shows collapsed. */
  maxTopics: integer("max_topics").notNull().default(6),
  showImages: integer("show_images", { mode: "boolean" })
    .notNull()
    .default(true),
  /** How long a fetched answer is cached before the upstream is asked again. */
  cacheMinutes: integer("cache_minutes").notNull().default(10),
  /** How long stored articles are kept before the retention sweep drops them. */
  retentionDays: integer("retention_days").notNull().default(30),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedBy: text("updated_by"),
});

export type NewsWidgetSettingsRow = typeof newsWidgetSettings.$inferSelect;
