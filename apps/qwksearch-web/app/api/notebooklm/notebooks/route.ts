/**
 * GET /api/notebooklm/notebooks — List user's notebooks
 * POST /api/notebooklm/notebooks — Create a new notebook
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentials } from "@/lib/notebooklm/credentials";
import { createNotebookLMClient } from "@/lib/notebooklm/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getCredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "NotebookLM not connected. POST to /api/notebooklm/login first." },
      { status: 403 },
    );
  }

  try {
    const client = createNotebookLMClient(creds);
    const notebooks = await client.listNotebooks();
    return NextResponse.json({ notebooks });
  } catch (err) {
    console.error("[notebooklm/notebooks] list error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 },
    );
  }

  try {
    const client = createNotebookLMClient(creds);
    const notebook = await client.createNotebook(body.title);
    return NextResponse.json({ notebook }, { status: 201 });
  } catch (err) {
    console.error("[notebooklm/notebooks] create error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
