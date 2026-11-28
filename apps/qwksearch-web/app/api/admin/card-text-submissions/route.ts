/**
 * @fileoverview Admin review of the full text readers suggest for citation
 * cards with no quoted text (see `/api/card-text-submissions`).
 *
 * - `GET`   — a page of submissions, newest first. `status` is `pending` (the
 *             default), `approved`, `rejected` or `all`; `page` and `limit`
 *             page through them. Also returns per-status counts for the tabs.
 * - `PATCH` — `{ id, status }` approves, rejects, or re-opens (`pending`) one.
 *
 * Both methods are admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { assertAdmin } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getQueryDB } from "@/lib/database";
import { cardTextSubmissions } from "@/lib/database/schema";
import { isSubmissionStatus, SUBMISSION_STATUSES } from "@/lib/card-text-submission";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const intParam = (raw: string | null, fallback: number) => {
  const parsed = parseInt(raw ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export async function GET(req: NextRequest) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status") ?? "pending";
  if (statusParam !== "all" && !isSubmissionStatus(statusParam)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  const page = Math.max(1, intParam(searchParams.get("page"), 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, intParam(searchParams.get("limit"), DEFAULT_LIMIT)));

  const db = getQueryDB();
  const filter = statusParam === "all" ? undefined : eq(cardTextSubmissions.status, statusParam);

  const [submissions, grouped] = await Promise.all([
    db
      .select()
      .from(cardTextSubmissions)
      .where(filter)
      .orderBy(desc(cardTextSubmissions.createdAt), desc(cardTextSubmissions.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ status: cardTextSubmissions.status, value: count() })
      .from(cardTextSubmissions)
      .groupBy(cardTextSubmissions.status),
  ]);

  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const row of grouped) counts[row.status] = row.value;
  const matched = statusParam === "all" ? counts.pending + counts.approved + counts.rejected : counts[statusParam];

  return NextResponse.json({
    submissions,
    page,
    limit,
    matched,
    pageCount: Math.max(Math.ceil(matched / limit), 1),
    counts,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await assertAdmin();
  if (guard) return guard;

  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const id = typeof body.id === "number" ? body.id : NaN;
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "A submission id is required" }, { status: 400 });
  }
  if (!isSubmissionStatus(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${SUBMISSION_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const session = await getSession();
  const reviewing = body.status !== "pending";
  const rows = await getQueryDB()
    .update(cardTextSubmissions)
    .set({
      status: body.status,
      reviewedAt: reviewing ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      reviewedBy: reviewing ? (session?.user.email ?? null) : null,
    })
    .where(eq(cardTextSubmissions.id, id))
    .returning();

  if (!rows.length) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  return NextResponse.json({ submission: rows[0] });
}
