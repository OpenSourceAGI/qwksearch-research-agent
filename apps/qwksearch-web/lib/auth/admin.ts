import { cache } from "react";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Admin access comes exclusively from the ADMIN_EMAILS (or legacy
 * ADMIN_EMAIL) env var — a comma-separated list of addresses; the two vars
 * are merged. With neither set, nobody is an admin: there is deliberately
 * no fallback (an earlier version promoted the first registered user, which
 * silently granted admin on deployments that forgot to set the var).
 */
export const getAdminEmails = cache(async (): Promise<string[]> => {
  const raw = [
    process.env.ADMIN_EMAIL ?? "",
    process.env.ADMIN_EMAILS ?? "",
  ].join(",");

  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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
