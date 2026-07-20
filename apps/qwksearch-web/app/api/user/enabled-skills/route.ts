/**
 * @fileoverview User Enabled Skills API
 * GET: Retrieve user's enabled/disabled skills
 * POST: Toggle a skill's enabled state
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

interface UserSkill {
  id: string;
  skillId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store - in production, use D1
const skillsStore = new Map<string, UserSkill[]>();

// Default enabled state for all skills
const DEFAULT_SKILLS = [
  'web-search',
  'document-fetch',
  'pdf-analysis',
  'code-analysis',
  'git-integration',
  'deployment',
  'data-extraction',
  'csv-processing',
  'data-visualization',
  'memory-recall',
  'context-synthesis',
  'fact-extraction',
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user's skill settings or initialize with defaults
    let userSkills = skillsStore.get(session.user.id);

    if (!userSkills) {
      // Initialize with defaults (all enabled)
      userSkills = DEFAULT_SKILLS.map((skillId) => ({
        id: `skill_${crypto.randomUUID()}`,
        skillId,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      skillsStore.set(session.user.id, userSkills);
    }

    // Return skills with just the essential info
    return NextResponse.json(
      userSkills.map((s) => ({
        id: s.skillId,
        enabled: s.enabled,
      }))
    );
  } catch (error) {
    console.error('Error fetching enabled skills:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { skillId, enabled } = body;

    if (!skillId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { message: 'Missing required fields: skillId, enabled' },
        { status: 400 }
      );
    }

    // Get or initialize user's skills
    let userSkills = skillsStore.get(session.user.id);
    if (!userSkills) {
      userSkills = DEFAULT_SKILLS.map((s) => ({
        id: `skill_${crypto.randomUUID()}`,
        skillId: s,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      skillsStore.set(session.user.id, userSkills);
    }

    // Find or create skill entry
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

    return NextResponse.json({
      message: `Skill ${enabled ? 'enabled' : 'disabled'} successfully`,
      skillId,
      enabled,
    });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
