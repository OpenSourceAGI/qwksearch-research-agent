/**
 * @fileoverview Site-wide settings for the homepage news widget, as set from
 * the admin panel (`/admin/news`).
 *
 * These live in D1 rather than in `lib/config`, whose config manager keeps
 * values in memory: a value written there survives only until the next Worker
 * isolate and is never seen by the other ones, so an admin who switched the
 * widget off would find it back on. One row, `id = 'global'`.
 *
 * Every read degrades to `DEFAULT_NEWS_WIDGET_SETTINGS` rather than throwing.
 * The widget is decoration on a page whose job is search — a database that is
 * missing, unmigrated or briefly unreachable must cost the news card, not the
 * homepage.
 */
import { eq } from "drizzle-orm";
import { getDB } from "../database";
import {
  newsWidgetSettings,
  type NewsWidgetSettingsRow,
} from "../database/schema";
import { parseTopicList } from "trending-news-api/server";

export const NEWS_SETTINGS_ID = "global";

export type NewsWidgetSettings = {
  enabled: boolean;
  defaultTopics: string;
  allowUserTopics: boolean;
  maxTopics: number;
  showImages: boolean;
  cacheMinutes: number;
  retentionDays: number;
};

export const DEFAULT_NEWS_WIDGET_SETTINGS: NewsWidgetSettings = {
  enabled: true,
  defaultTopics: "",
  allowUserTopics: true,
  maxTopics: 6,
  showImages: true,
  cacheMinutes: 10,
  retentionDays: 30,
};

/**
 * Bounds for the numeric settings. `cacheMinutes` has a floor because each
 * cold answer costs one Wikipedia call plus one News API search *per topic* —
 * a zero-minute cache would spend the day's quota on a single popular hour.
 */
const LIMITS = {
  maxTopics: { min: 1, max: 20 },
  cacheMinutes: { min: 1, max: 24 * 60 },
  retentionDays: { min: 1, max: 365 },
} as const;

function clamp(value: unknown, fallback: number, key: keyof typeof LIMITS): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  const { min, max } = LIMITS[key];
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

/** Normalises a row or a request body into settings we are willing to store. */
export function normalizeNewsWidgetSettings(
  input: Partial<Record<keyof NewsWidgetSettings, unknown>> | null | undefined,
  base: NewsWidgetSettings = DEFAULT_NEWS_WIDGET_SETTINGS,
): NewsWidgetSettings {
  const raw = input ?? {};
  return {
    enabled: toBool(raw.enabled, base.enabled),
    // Stored back in the canonical comma-separated form the parser produces,
    // so the admin field and the widget never disagree about what was saved.
    defaultTopics:
      raw.defaultTopics === undefined
        ? base.defaultTopics
        : parseTopicList(String(raw.defaultTopics)).join(", "),
    allowUserTopics: toBool(raw.allowUserTopics, base.allowUserTopics),
    maxTopics: clamp(raw.maxTopics, base.maxTopics, "maxTopics"),
    showImages: toBool(raw.showImages, base.showImages),
    cacheMinutes: clamp(raw.cacheMinutes, base.cacheMinutes, "cacheMinutes"),
    retentionDays: clamp(raw.retentionDays, base.retentionDays, "retentionDays"),
  };
}

/** The site's news-widget settings, or the defaults if they can't be read. */
export async function getNewsWidgetSettings(): Promise<NewsWidgetSettings> {
  try {
    const rows = await getDB()
      .select()
      .from(newsWidgetSettings)
      .where(eq(newsWidgetSettings.id, NEWS_SETTINGS_ID))
      .limit(1);

    const row = rows[0] as NewsWidgetSettingsRow | undefined;
    if (!row) return { ...DEFAULT_NEWS_WIDGET_SETTINGS };

    return normalizeNewsWidgetSettings(row);
  } catch (error) {
    console.error("News widget settings read failed:", error);
    return { ...DEFAULT_NEWS_WIDGET_SETTINGS };
  }
}

/**
 * Writes the settings row, merging over whatever is stored now so a partial
 * body only changes the fields it names. Unlike the read, a failed write is
 * reported: the admin has to know their change did not take.
 */
export async function saveNewsWidgetSettings(
  patch: Partial<Record<keyof NewsWidgetSettings, unknown>>,
  updatedBy?: string,
): Promise<NewsWidgetSettings> {
  const current = await getNewsWidgetSettings();
  const next = normalizeNewsWidgetSettings(patch, current);

  const row = {
    id: NEWS_SETTINGS_ID,
    ...next,
    updatedAt: new Date(),
    updatedBy: updatedBy ?? null,
  };

  await getDB()
    .insert(newsWidgetSettings)
    .values(row)
    .onConflictDoUpdate({ target: newsWidgetSettings.id, set: row });

  return next;
}

/**
 * The topic list a request should be served, given what the visitor asked for.
 * An empty result means "use Wikipedia's daily ranking".
 */
export function resolveTopics(
  settings: NewsWidgetSettings,
  requestedTopics: string | string[] | null | undefined,
): string[] {
  const requested = settings.allowUserTopics ? parseTopicList(requestedTopics) : [];
  if (requested.length > 0) return requested;
  return parseTopicList(settings.defaultTopics);
}
