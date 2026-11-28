/**
 * @fileoverview `POST /api/card-text-submissions`: where the "suggest the full
 * text" dialog of an `extract-refdoc` citation card sends its text.
 *
 * How the pieces connect:
 * - A `.refdoc.html` file is static and CDN-hosted, so it stores nothing. It is
 *   written with `submitEndpoint` pointing here (`extract-refdoc <src>
 *   --submit-endpoint https://<this site>/api/card-text-submissions`, or a
 *   `data-submit-endpoint` attribute on its runtime script tag), and the red X
 *   on a card with no text posts `{ document, reference, text, … }` here
 *   cross-origin — hence `withCors`, with the API-key check skipped: this
 *   endpoint is public by design, no account or key.
 * - The row goes into `card_text_submissions` (`lib/database/schema.ts`,
 *   migration `drizzle/0015_add_card_text_submissions.sql`) as `pending`.
 * - Admins approve or reject it at `/admin/card-text`
 *   (`/api/admin/card-text-submissions`).
 *
 * Spam: a hidden `website` field that only bots fill gets a quiet 201 with
 * nothing stored; each hashed address may send `SUBMISSIONS_PER_WINDOW`
 * suggestions per hour (429 after that); text is length-checked.
 */
import { NextResponse } from "next/server";
import { and, count, eq, gte } from "drizzle-orm";
import { getQueryDB } from "@/lib/database";
import { cardTextSubmissions } from "@/lib/database/schema";
import { corsPreflight, withCors } from "@/lib/cors";
import {
  clientIp,
  hashIp,
  MAX_BODY_BYTES,
  parseCardTextSubmission,
  sqliteTimestamp,
  SUBMISSIONS_PER_WINDOW,
  WINDOW_MS,
} from "@/lib/card-text-submission";

export const runtime = "nodejs";

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers });

export const POST = withCors(
  async (request?: Request) => {
    if (!request) return json({ error: "Invalid request" }, 400);

    const length = Number(request.headers?.get?.("content-length") ?? 0);
    if (length > MAX_BODY_BYTES) return json({ error: "That is too large to send." }, 413);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }

    const parsed = parseCardTextSubmission(body);
    if (parsed.ok === false) return json({ error: parsed.error }, 400);
    if ("honeypot" in parsed) return json({ success: true }, 201);

    try {
      const db = getQueryDB();
      const ipHash = await hashIp(
        clientIp(request.headers),
        process.env.CARD_TEXT_IP_SALT ?? process.env.BETTER_AUTH_SECRET ?? "card-text",
      );

      const [{ value: recent }] = await db
        .select({ value: count() })
        .from(cardTextSubmissions)
        .where(
          and(
            eq(cardTextSubmissions.submitterIpHash, ipHash),
            gte(cardTextSubmissions.createdAt, sqliteTimestamp(Date.now() - WINDOW_MS)),
          ),
        );
      if (recent >= SUBMISSIONS_PER_WINDOW) {
        return json(
          { error: "Too many suggestions just now. Please try again later." },
          429,
          { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) },
        );
      }

      const { value } = parsed;
      await db.insert(cardTextSubmissions).values({
        documentKey: value.documentKey,
        documentTitle: value.documentTitle,
        referenceKey: value.referenceKey,
        referenceLabel: value.referenceLabel,
        submittedText: value.text,
        status: "pending",
        submitterIpHash: ipHash,
      });

      return json({ success: true }, 201);
    } catch (error) {
      console.error("Error saving card text submission:", error);
      return json({ error: "Failed to save your suggestion. Please try again." }, 500);
    }
  },
  { skipApiKeyCheck: true },
);

export const OPTIONS = corsPreflight;
