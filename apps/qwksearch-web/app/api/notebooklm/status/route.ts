/**
 * GET /api/notebooklm/status
 *
 * Returns whether the current user has NotebookLM credentials stored,
 * and optionally validates the session is still active.
 *
 * DELETE /api/notebooklm/status
 * Removes stored credentials.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getCredentials,
  deleteCredentials,
} from "@/lib/notebooklm/credentials";
import { validateSession } from "@/lib/notebooklm/login";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const creds = await getCredentials(session.user.id);
    if (!creds) {
      return NextResponse.json({
        connected: false,
        message: "No NotebookLM credentials stored",
      });
    }

    return NextResponse.json({
      connected: true,
      googleEmail: creds.googleEmail,
      createdAt: creds.createdAt,
      expiresAt: creds.expiresAt,
    });
  } catch (err) {
    console.error("[notebooklm/status] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteCredentials(session.user.id);
    return NextResponse.json({
      success: true,
      message: "NotebookLM credentials removed",
    });
  } catch (err) {
    console.error("[notebooklm/status] delete error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
