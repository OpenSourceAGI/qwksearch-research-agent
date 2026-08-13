/**
 * @fileoverview User profile API. GET returns the current user's profile.
 * PATCH updates name and/or email. DELETE deletes the account.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { initAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const [u] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      apiKey: userTable.apiKey,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!u) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Auto-generate API key if missing
  if (!u.apiKey) {
    const newApiKey = `qwk_${crypto.randomUUID().replace(/-/g, '')}`;
    await db.update(userTable).set({ apiKey: newApiKey }).where(eq(userTable.id, session.user.id));
    u.apiKey = newApiKey;
  }

  return NextResponse.json(u);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, image, regenerateApiKey } = body;

  const updates: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) {
    if (typeof name !== "string" || name.length > 32) {
      return NextResponse.json(
        { message: "Name must be 32 characters or fewer." },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      );
    }
    updates.email = email;
  }

  if (image !== undefined) {
    updates.image = image;
  }

  if (regenerateApiKey) {
    updates.apiKey = `qwk_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  const db = getDB();
  await db
    .update(userTable)
    .set(updates)
    .where(eq(userTable.id, session.user.id));

  return NextResponse.json({ message: "Profile updated successfully." });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const auth = await initAuth();
    const response = await auth.api.deleteUser({
      headers: await headers(),
      body: {},
    });

    if (response?.success === false) {
      return NextResponse.json(
        { message: response.message || "Failed to delete account." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Acc