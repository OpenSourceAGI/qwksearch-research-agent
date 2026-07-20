/**
 * @fileoverview Individual Memory API
 * GET: Retrieve a specific memory
 * PUT: Update a memory
 * DELETE: Delete a memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// In-memory store (reuse from route.ts in production with proper DB)
const memoriesStore = new Map<string, any[]>();

export async function GET(
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

    return NextResponse.json(memory);
  } catch (error) {
    console.error('Error fetching memory:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userMemories = memoriesStore.get(session.user.id) || [];
    const memoryIndex = userMemories.findIndex((m) => m.id === params.id);

    if (memoryIndex === -1) {
      return NextResponse.json({ message: 'Memory not found' }, { status: 404 });
    }

    // Update allowed fields
    const memory = userMemories[memoryIndex];
    if (body.name !== undefined) memory.name = body.name;
    if (body.description !== undefined) memory.description = body.description;
    if (body.importance !== undefined) {
      memory.importance = Math.min(10, Math.max(1, body.importance));
    }
    if (body.tags !== undefined) memory.tags = body.tags;
    if (body.metadata !== undefined) memory.metadata = body.metadata;

    memory.updatedAt = new Date();

    return NextResponse.json({
      message: 'Memory updated successfully',
      memory,
    });
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userMemories = memoriesStore.get(session.user.id) || [];
    const memoryIndex = userMemories.findIndex((m) => m.id === params.id);

    if (memoryIndex === -1) {
      return NextResponse.json({ message: 'Memory not found' }, { status: 404 });
    }

    userMemories.splice(memoryIndex, 1);

    return NextResponse.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
