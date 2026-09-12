/**
 * @fileoverview Document-level access control for the collaboration server.
 * GET answers "what may this user do to this document" with
 * `{ role: 'read' | 'write' | null }`, applying the same owner-based rule as
 * `/api/doc/documents/[id]`: the owner may write, a document with no owner is
 * open (local-storage mode), and everyone else is refused.
 *
 * It is the `REASON_DOCUMENT_ACL_URL` half of `lib/collaboration/rooms.ts`. A
 * room is a permission boundary — anyone who can sync it can read and write the
 * document — so this is the check that keeps a second user out, and it runs
 * before any Yjs state is exchanged.
 *
 * Unlike every other route here it names a user instead of reading the caller's
 * session, so it is service-to-service only: `REASON_COLLAB_SECRET` must match
 * the collaboration server's, and the endpoint refuses to answer in production
 * when that secret is unset rather than becoming an open "who can read what"
 * oracle.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/database";
import { documents } from "@/lib/database/schema";

export const runtime = "nodejs";

export type DocumentRole = "read" | "write" | null;

/** Timing-safe-enough comparison for a shared secret of known length. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(req: NextRequest) {
  const secret = process.env.REASON_COLLAB_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[collaboration] REASON_COLLAB_SECRET is unset; refusing to answer document ACL lookups",
      );
      return NextResponse.json(
        { error: "Collaboration ACL is not configured" },
        { status: 503 },
      );
    }
  } else if (!secretMatches(req.headers.get("x-collaboration-secret"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = req.nextUrl.searchParams.get("documentId");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!documentId || !userId) {
    return NextResponse.json(
      { error: "documentId and userId are required" },
      { status: 400 },
    );
  }

  const numericId = Number.parseInt(documentId, 10);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ role: null }, { status: 404 });
  }

  try {
    const db = getDB();
    const [document] = await db
      .select({ id: documents.id, userId: documents.userId })
      .from(documents)
      .where(eq(documents.id, numericId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ role: null }, { status: 404 });
    }

    // Same rule as the document CRUD routes: an unowned document belongs to
    // whoever opens it (local-storage mode), an owned one only to its owner.
    const role: DocumentRole =
      !document.userId || document.userId === userId ? "write" : null;

    return NextResponse.json({ role });
  } catch (error) {
    console.error("[collaboration] document ACL lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to resolve document access" },
      { status: 500 },
    );
  }
}
