/**
 * @fileoverview Memory Usage Tracking API
 * POST: Record that a memory was used/accessed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// In-memory store (reuse from route.ts in production)
const memoriesStore = new Map<string, any[]>();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userMemories = memoriesStore.get(session.user.id) || [];
    const memory = userMemories.find((m) => m.id === params.id);

    if (!memory) {
      return NextResponse.json({ message: 'Memory not found' }, { status: 404 });
    }

    // Increment access count
    memory.accessCount = (memory.accessCount || 0) + 1;
    memory.updatedAt = new Date();

    return NextResponse.json({
      message: 'Usage recorded',
      accessCount: memory.accessCount,
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
