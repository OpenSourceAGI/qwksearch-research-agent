/**
 * @fileoverview User Memories API
 * GET: Retrieve user's memories with filtering and search
 * POST: Create a new memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDB } from '@/lib/database';
import { eq, and, gte, like, or, desc } from 'drizzle-orm';

// Import or create schema
// Assuming memories table exists in schema
interface MemoryRecord {
  id: string;
  userId: string;
  name: string;
  type: 'user' | 'feedback' | 'project' | 'reference' | 'conversation';
  description: string;
  content: string;
  importance: number;
  accessCount: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// For now, we'll use an in-memory store. In production, use D1/Drizzle
const memoriesStore = new Map<string, MemoryRecord[]>();

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type') as MemoryRecord['type'] | null;
    const importance = parseInt(searchParams.get('importance') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get memories for this user
    const userMemories = memoriesStore.get(session.user.id) || [];

    // Apply filters
    let filtered = userMemories;

    if (type) {
      filtered = filtered.filter((m) => m.type === type);
    }

    if (importance > 0) {
      filtered = filtered.filter((m) => m.importance >= importance);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.description.toLowerCase().includes(searchLower) ||
          m.content.toLowerCase().includes(searchLower) ||
          m.tags?.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    // Sort by importance (desc) then updated date (desc)
    filtered.sort(
      (a, b) =>
        b.importance - a.importance ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    return NextResponse.json(filtered.slice(0, limit));
  } catch (error) {
    console.error('Error fetching memories:', error);
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
    const { name, type, description, content, importance, tags, metadata } =
      body;

    // Validate required fields
    if (!name || !type || !content) {
      return NextResponse.json(
        { message: 'Missing required fields: name, type, content' },
        { status: 400 }
      );
    }

    if (!['user', 'feedback', 'project', 'reference', 'conversation'].includes(type)) {
      return NextResponse.json(
        { message: 'Invalid memory type' },
        { status: 400 }
      );
    }

    const id = `mem_${crypto.randomUUID()}`;
    const now = new Date();

    const memory: MemoryRecord = {
      id,
      userId: session.user.id,
      name,
      type,
      description: description || '',
      content,
      importance: Math.min(10, Math.max(1, importance || 5)),
      accessCount: 0,
      tags: Array.isArray(tags) ? tags : [],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Store memory
    if (!memoriesStore.has(session.user.id)) {
      memoriesStore.set(session.user.id, []);
    }
    memoriesStore.get(session.user.id)!.push(memory);

    return NextResponse.json(
      { id, message: 'Memory created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
