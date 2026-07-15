/**
 * GET /api/notebooklm/notebooks/:id/sources — List sources in a notebook
 * POST /api/notebooklm/notebooks/:id/sources — Add a source (URL or text)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentials } from "@/lib/notebooklm/credentials";
import { createNotebookLMClient } from "@/lib/notebooklm/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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

  try {
    const client = createNotebookLMClient(creds);
    const sources = await client.listSources(id);
    return NextResponse.json({ sources });
  } catch (err) {
    console.error("[notebooklm/sources] list error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

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

  if (!body?.url && !body?.text) {
    return NextResponse.json(
      { error: "url or text is required" },
      { status: 400 },
    );
  }

  try {
    const client = createNotebookLMClient(creds);
    const source = await client.addSource(id, {
      url: body.url,
      text: body.text,
      title: body.title,
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    console.error("[notebooklm/sources] add error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
