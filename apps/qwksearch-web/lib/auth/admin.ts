import { cache } from "react";
import { NextResponse } from "next/server";
import { getSession, type AuthSession } from "@/lib/auth";
import { getDB } from "@/lib/database";
import { user } from "@/lib/database/schema";
import { asc } from "drizzle-orm";

export const getAdminEmails = cache(async (): Promise<string[]> => {
  const raw = [
    process.env.ADMIN_EMAIL ?? "",
    process.env.ADMIN_EMAILS ?? "",
  ].join(",");

  const fromEnv = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  const db = getDB();
  const [firstUser] = await db
    .select({ email: user.email })
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1);

  if (firstUser?.email) {
    return [firstUser.email.toLowerCase()];
  }

  return [];
});

export async function isAdmin(email: string): Promise<boolean> {
  const admins = await getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}

export async function assertAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authorized = await isAdmin(session.user.email);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
