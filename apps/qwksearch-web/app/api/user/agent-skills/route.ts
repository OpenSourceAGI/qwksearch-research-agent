import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { userAgentSkills } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const skills = await db
    .select()
    .from(userAgentSkills)
    .where(eq(userAgentSkills.userId, session.user.id));

  return NextResponse.json(skills);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { skillId, enabled } = body;

  if (!skillId || typeof enabled !== "boolean") {
    return NextResponse.json(
      { message: "skillId and enabled are required" },
      { status: 400 }
    );
  }

  const db = getDB();
  const now = new Date();

  const existing = await db
    .select()
    .from(userAgentSkills)
    .where(
      and(
        eq(userAgentSkills.userId, session.user.id),
        eq(userAgentSkills.skillId, skillId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userAgentSkills)
      .set({ enabled, updatedAt: now })
      .where(
        and(
          eq(userAgentSkills.userId, session.user.id),
          eq(userAgentSkills.skillId, skillId)
        )
      );
  } else {
    await db.insert(userAgentSkills).values({
      id: `skill_${crypto.randomUUID()}`,
      userId: session.user.id,
      skillId,
      enabled,
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ message: "Skill preference updated" });
}
