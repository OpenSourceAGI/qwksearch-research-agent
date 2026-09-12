/**
 * @fileoverview Document collection endpoint. GET lists all documents for
 * the authenticated user (or anonymous). POST creates a new document or
 * folder with optional parent, metadata, and tags.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { documents } from "@/lib/database/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { initAuth } from "@/lib/auth";
import { AuthSession } from "@/lib/auth/session";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";

// GET all documents for a user
async function handleDocumentsGet(req: NextRequest) {
  try {
    const db = getDB();
    const auth = await initAuth();
    const session = (await auth.api.getSession({
      headers: req.headers,
    })) as AuthSession | null;

    // For now, allow unauthenticated access (local storage mode)
    // In production, you might want to enforce authentication
    const userId = session?.user?.id || null;

    const userDocuments = await db
      .select()
      .from(documents)
      .where(userId ? eq(documents.userId, userId) : isNull(documents.userId))
      .orderBy(desc(documents.updatedAt));

    return NextResponse.json(userDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

// POST - Create a new document
async function handleDocumentsPost(req: NextRequest) {
  try {
    const db = getDB();
    const auth = await initAuth();
    const session = (await auth.api.getSession({
      headers: req.headers,
    })) as AuthSession | null;
    const userId = session?.user?.id || null;

    const body = await req.json();
    const { name, title, content, parentId, isFolder, metadata, tags } = body;

    const now = new Date().toISOString();

    const [newDocument] = await db
      .insert(documents)
      .values({
        name: name || title || "Untitled",
        title: title || "Untitled",
        content: content || "",
        parentId: parentId || null,
        isExpanded: isFolder ? 1 : 0,
        isFolder: isFolder ? 1 : 0,
        type: 0,
        createdAt: now,
        updatedAt: now,
        userId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    return NextResponse.json(newDocument);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}

export const GET = withCors(handleDocumentsGet);
export const POST = withCors(handleDocumentsPost);
export const OPTIONS = corsPreflight;
