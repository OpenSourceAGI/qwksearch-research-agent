/**
 * POST /api/notebooklm/notebooks/:id/ask
 *
 * Ask a question against a notebook's sources.
 * Body: { query: string }
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
  const body = await request.json().catch(() => null);

  if (!body?.query) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 },
    );
  }

  try {
    const client = createNotebookLMClient(creds);
    const result = await client.ask(id, body.query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[notebooklm/ask] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
