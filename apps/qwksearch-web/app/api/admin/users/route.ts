import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { user } from "@/lib/database/schema";
import { getSession } from "@/lib/auth/session";
import { like, or, desc, count } from "drizzle-orm";

export const runtime = "nodejs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function assertAdmin() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    ADMIN_EMAILS.length > 0 &&
    !ADMIN_EMAILS.includes(session.user.email.toLowerCase())
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const q = searchParams.get("q")?.trim() ?? "";
  const offset = (page - 1) * limit;

  const db = getDB();

  const where = q
    ? or(
        like(user.email, `%${q}%`),
        like(user.name, `%${q}%`),
        like(user.id, `%${q}%`),
      )
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);

  return NextResponse.json({
    users: rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}
