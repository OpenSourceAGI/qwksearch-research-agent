/**
 * @fileoverview Batch Skills Update API
 * POST: Update multiple skills in a single request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// In-memory store (reuse from route.ts)
const skillsStore = new Map<string, any[]>();

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: 'Invalid updates array' },
        { status: 400 }
      );
    }

    // Validate all updates
    for (const update of updates) {
      if (!update.skillId || typeof update.enabled !== 'boolean') {
        return NextResponse.json(
          { message: 'Each update must have skillId and enabled' },
          { status: 400 }
        );
      }
    }

    let userSkills = skillsStore.get(session.user.id) || [];

    // Apply updates
    const results = [];
    for (const { skillId, enabled } of updates) {
      let skill = userSkills.find((s) => s.skillId === skillId);

      if (!skill) {
        skill = {
          id: `skill_${crypto.randomUUID()}`,
          skillId,
          enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        userSkills.push(skill);
      } else {
        skill.enabled = enabled;
        skill.updatedAt = new Date();
      }

      results.push({ skillId, enabled });
    }

    skillsStore.set(session.user.id, userSkills);

    return NextResponse.json({
      message: `Updated ${updates.length} skills`,
      results,
    });
  } catch (error) {
    console.error('Error batch updating skills:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
