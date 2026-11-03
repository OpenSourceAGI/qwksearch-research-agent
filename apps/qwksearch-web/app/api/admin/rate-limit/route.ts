/**
 * @fileoverview Admin control of the `/api/*` rate limiter.
 *
 * - `GET`    — current settings, plus the busiest client windows still open.
 * - `POST`   — save settings (partial body; only the fields named change), or
 *              `{ action: "reset", bucket? }` to clear one client's counter
 *              (unblock them now) or every counter.
 *
 * Admin-only. The settings live in D1 (`lib/rate-limit/api-settings`) so a
 * change made here holds on every Worker isolate, not just this one. The
 * limiter itself runs in `worker/index.ts`; `/api/admin/*` is exempt by
 * default so a limit set too tight cannot lock the admin out of this route.
 */
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getQueryDB } from "@/lib/database";
import type { ApiRateLimitSettings } from "@/lib/rate-limit/api-rules";
import {
  SETTINGS_CACHE_MS,
  readApiRateLimitSettings,
  saveApiRateLimitSettings,
} from "@/lib/rate-limit/api-settings";
import { countOpenWindows, listActiveBuckets, resetCounters } from "@/lib/rate-limit/api-limiter";

/** The settings fields a POST body may name. Anything else is ignored. */
const EDITABLE: (keyof ApiRateLimitSettings)[] = [
  "enabled",
  "requestsPerWindow",
  "windowSeconds",
  "overrides",
  "exemptPaths",
];

function pickEditable(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch;
}

/** Counters are read separately so a missing table still shows the settings. */
async function readActivity() {
  const db = getQueryDB();
  try {
    const [buckets, openWindows] = await Promise.all([
      listActiveBuckets(db),
      countOpenWindows(db),
    ]);
    return { buckets, openWindows, error: null as string | null };
  } catch (error) {
    console.error("Admin rate-limit activity read failed:", error);
    return {
      buckets: [],
      openWindows: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const GET = async () => {
  const guard = await assertAdmin();
  if (guard) return guard;

  const [settings, activity] = await Promise.all([
    readApiRateLimitSettings(getQueryDB()),
    readActivity(),
  ]);

  return NextResponse.json({
    settings,
    activity,
    settingsCacheSeconds: Math.round(SETTINGS_CACHE_MS / 1000),
    now: Math.floor(Date.now() / 1000),
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Expected a JSON object." }, { status: 400 });
  }

  try {
    if (body.action === "reset") {
      const bucket = typeof body.bucket === "string" && body.bucket ? body.bucket : undefined;
      const deleted = await resetCounters(getQueryDB(), bucket);
      return NextResponse.json({ deleted, activity: await readActivity() });
    }

    const patch = pickEditable(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { message: "No known settings in request body." },
        { status: 400 },
      );
    }

    const session = await getSession();
    const settings = await saveApiRateLimitSettings(getQueryDB(), patch, session?.user?.email);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin rate-limit update failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An error has occurred." },
      { status: 500 },
    );
  }
};
