/**
 * @fileoverview Session management API. GET lists all active sessions for the
 * current user. DELETE revokes all sessions except the current one.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { session as sessionTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { initAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const currentSession = await getSession();
  if (!currentSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const sessions = await db
    .select({
      id: sessionTable.id,
      token: sessionTable.token,
      ipAddress: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
      createdAt: sessionTable.createdAt,
      updatedAt: sessionTable.updatedAt,
      expiresAt: sessionTable.expiresAt,
    })
    .from(sessionTable)
    .where(eq(sessionTable.userId, currentSession.user.id));

  // Mark which session is current
  const result = sessions.map((s) => ({
    ...s,
    isCurrent: s.id === currentSession.session.id,
  }));

  return NextResponse.json(result);
}

export async function DELETE() {
  const currentSession = await getSession();
  if (!currentSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const auth = await initAuth();
    await auth.api.revokeOtherSessions({
      headers: await headers(),
    });
    return NextResponse.json({
      message: "All other sessions revoked successfully.",
    });
  } catch (error) {
    console.error("Error revoking sessions:", error);
    return NextResponse.json(
      { message: "Failed to revoke sessions." },
      { status: 500 }
    );
  }
}
