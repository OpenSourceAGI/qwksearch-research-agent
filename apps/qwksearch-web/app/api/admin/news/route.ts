/**
 * @fileoverview Admin control of the homepage news widget.
 *
 * - `GET`    — current settings plus what the archive holds.
 * - `POST`   — save settings (partial body; only the fields named change), or
 *              run an action: `refresh` fetches and stores now, `prune` drops
 *              articles past the retention window.
 * - `DELETE` — empty the archive.
 *
 * Every method is admin-only. The settings live in D1 (see
 * `lib/news/settings`) rather than the in-memory config manager, so a change
 * made here survives the Worker isolate that served the request.
 */
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import {
  getNewsWidgetSettings,
  saveNewsWidgetSettings,
  type NewsWidgetSettings,
} from "@/lib/news/settings";
import {
  clearStoredNews,
  getNewsStoreStats,
  pruneStoredNews,
  readStoredTopicArticles,
} from "@/lib/news/store";
import { getNewsApiKey, refreshStoredNews } from "@/lib/news/trending";

/** The settings fields a POST body may name. Anything else is ignored. */
const EDITABLE: (keyof NewsWidgetSettings)[] = [
  "enabled",
  "defaultTopics",
  "allowUserTopics",
  "maxTopics",
  "showImages",
  "cacheMinutes",
  "retentionDays",
];

function pickEditable(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch;
}

export const GET = async (req: NextRequest) => {
  const guard = await assertAdmin();
  if (guard) return guard;

  const topic = req.nextUrl?.searchParams?.get("topic");
  if (topic) {
    return NextResponse.json({ topic, articles: await readStoredTopicArticles(topic) });
  }

  const [settings, stats] = await Promise.all([
    getNewsWidgetSettings(),
    getNewsStoreStats(),
  ]);

  return NextResponse.json({
    settings,
    stats,
    // Whether the upstream is usable at all — the most common reason for an
    // empty widget is a deployment with no key, and an admin looking at this
    // page should not have to guess. The key itself is never returned.
    apiKeyConfigured: Boolean(getNewsApiKey()),
  });
};

export const POST = async (req: NextRequest) => {
  const guard = await assertAdmin();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  try {
    if (body.action === "refresh") {
      const result = await refreshStoredNews();
      return NextResponse.json({
        ...result,
        stats: await getNewsStoreStats(),
      });
    }

    if (body.action === "prune") {
      const settings = await getNewsWidgetSettings();
      const deleted = await pruneStoredNews(settings.retentionDays);
      return NextResponse.json({ deleted, stats: await getNewsStoreStats() });
    }

    const patch = pickEditable(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { message: "No known settings in request body." },
        { status: 400 },
      );
    }

    const session = await getSession();
    const settings = await saveNewsWidgetSettings(patch, session?.user?.email);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin news update failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An error has occurred." },
      { status: 500 },
    );
  }
};

export const DELETE = async () => {
  const guard = await assertAdmin();
  if (guard) return guard;

  try {
    const deleted = await clearStoredNews();
    return NextResponse.json({ deleted, stats: await getNewsStoreStats() });
  } catch (error) {
    console.error("Admin news clear failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An error has occurred." },
      { status: 500 },
    );
  }
};
