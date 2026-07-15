/**
 * DELETE /api/notebooklm/notebooks/:id — Delete a notebook
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCredentials } from "@/lib/notebooklm/credentials";
import { createNotebookLMClient } from "@/lib/notebooklm/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function DELETE(
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
    await client.deleteNotebook(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notebooklm/notebooks/delete] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
