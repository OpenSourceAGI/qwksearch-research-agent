/**
 * POST /api/notebooklm/login
 *
 * Accepts user's Google email + password, automates login via CF Puppeteer,
 * and stores the resulting auth cookies in KV for subsequent API calls.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { performGoogleLogin } from "@/lib/notebooklm/login";
import { storeCredentials } from "@/lib/notebooklm/credentials";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const { email, password } = body as { email: string; password: string };
  const sessionId = `notebooklm-${session.user.id}`;

  try {
    const result = await performGoogleLogin(sessionId, email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Login failed" },
        { status: 422 },
      );
    }

    await storeCredentials(session.user.id, {
      googleEmail: email,
      cookies: result.cookies || [],
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return NextResponse.json({
      success: true,
      googleEmail: email,
      message: "NotebookLM credentials stored successfully",
    });
  } catch (err) {
    console.error("[notebooklm/login] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal error during login" },
      { status: 500 },
    );
  }
}
