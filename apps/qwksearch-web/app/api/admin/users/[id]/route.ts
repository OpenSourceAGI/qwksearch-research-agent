import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { user } from "@/lib/database/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, boolean> = {
    name: true,
    trialAllowed: true,
    storageQuotaBytes: true,
  };

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed[k]) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = getDB();
  const rows = await db
    .update(user)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning();

  if (!rows.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: rows[0] });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await assertAdmin();
  if (guard) return guard;

  const { id } = await params;
  const db = getDB();

  const rows = await db.delete(user).where(eq(user.id, id)).returning();
  if (!rows.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
