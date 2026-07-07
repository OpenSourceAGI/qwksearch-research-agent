/**
 * @fileoverview Messages endpoint for saving suggestions and other message types.
 * POST saves a new message (suggestions, etc.) to the database.
 */
import { getDB } from '@/lib/database';
import { messages } from '@/lib/database/schema';
import { requireUserId } from '@/lib/auth/session';

export const POST = async (req: Request) => {
  try {
    const db = getDB();
    const userId = await requireUserId();

    const body = await req.json();
    const { chatId, messageId, role, suggestions, content, sources } = body;

    if (!chatId || !messageId || !role) {
      return Response.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await db.insert(messages).values({
      chatId,
      userId,
      messageId,
      role,
      content: content || '',
      suggestions: suggestions || [],
      sources: sources || [],
      createdAt: new Date().toISOString(),
    });

    return Response.json(
      { message: 'Message saved successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error saving message:', err);
    return Response.json(
      { message: 'Failed to save message' },
      { status: 500 }
    );
  }
};
