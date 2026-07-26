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
import { detectVpnAndLocation } from "@/lib/cloudflare/ip-geolocation";

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
      city: sessionTable.city,
      state: sessionTable.state,
      isVpn: sessionTable.isVpn,
    })
    .from(sessionTable)
    .where(eq(sessionTable.userId, currentSession.user.id));

  // Enrich sessions with VPN/location data if missing
  const enrichedSessions = await Promise.all(
    sessions.map(async (s) => {
      let city = s.city;
      let state = s.state;
      let isVpn = s.isVpn;

      if (!city || !state || isVpn === null) {
        const geoData = await detectVpnAndLocation(s.ipAddress);
        city = city || geoData.city;
        state = state || geoData.state;
        isVpn = isVpn !== null ? isVpn : geoData.isVpn;

        // Update DB for next time
        if (!s.city || !s.state || s.isVpn === null) {
          await db
            .update(sessionTable)
            .set({
              city: city || null,
              state: state || null,
              isVpn: isVpn ? 1 : 0,
            })
            .where(eq(sessionTable.id, s.id));
        }
      }

      return {
        ...s,
        city,
        state,
        isVpn: Boolean(isVpn),
        isCurrent: s.id === currentSession.session.id,
      };
    })
  );

  return NextResponse.json(enrichedSessions);
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
