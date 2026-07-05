/**
 * @fileoverview Linked social accounts API. GET lists all OAuth accounts
 * linked to the current user.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { account as accountTable } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const accounts = await db
    .select({
      id: accountTable.id,
      providerId: accountTable.providerId,
      accountId: accountTable.accountId,
      createdAt: accountTable.createdAt,
    })
    .from(accountTable)
    .where(eq(accountTable.userId, session.user.id));

  return NextResponse.json(accounts);
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ message: "Account ID is required" }, { status: 400 });
    }

    const db = getDB();

    // Check if this is the only account
    const allAccounts = await db
      .select()
      .from(accountTable)
      .where(eq(accountTable.userId, session.user.id));

    if (allAccounts.length <= 1) {
      return NextResponse.json(
        { message: "Cannot unlink your only account. Add another account first." },
        { status: 400 }
      );
    }

    // Delete the account
    await db
      .delete(accountTable)
      .where(eq(accountTable.id, accountId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking account:", error);
    return NextResponse.json(
      { message: "Failed to unlink account" },
      { status: 500 }
    );
  }
}
