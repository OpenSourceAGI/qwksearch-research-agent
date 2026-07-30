import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { user } from "@/lib/database/schema";
import { assertAdmin } from "@/lib/auth/admin";
import { like, or, desc, count } from "drizzle-orm";

export const runtime = "nodejs";

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
