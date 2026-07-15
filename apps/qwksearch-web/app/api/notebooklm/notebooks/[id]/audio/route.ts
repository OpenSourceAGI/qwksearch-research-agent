/**
 * POST /api/notebooklm/notebooks/:id/audio
 *
 * Generate an Audio Overview (podcast-style) for a notebook.
 * Body: { instructions?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentials } from "@/lib/notebooklm/credentials";
import { createNotebookLMClient } from "@/lib/notebooklm/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getCredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "NotebookLM not connected" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const client = createNotebookLMClient(creds);
    const result = await client.generateAudio(id, {
      instructions: body?.instructions,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[notebooklm/audio] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
