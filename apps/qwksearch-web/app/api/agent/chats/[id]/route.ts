/**
 * @fileoverview Single chat session endpoint. GET retrieves a chat and its
 * messages by ID (owner-scoped). DELETE removes a specific chat session
 * and all its messages.
 */
import { getDB } from '@/lib/database';
import { chats, messages } from '@/lib/database/schema';
import { and, eq } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/session';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const db = getDB();
    const { id } = await params;

    // Try to get userId, but don't require it (public chats allowed)
    let userId: string | undefined;
    try {
      userId = await requireUserId();
    } catch (err) {
      // Not authenticated - continue without userId for public chats
      userId = undefined;
    }

    console.log('[GET /api/chats/[id]] Looking for chatId:', id, 'userId:', userId || 'guest');

    // First check if chat exists and is public
    const chatExists = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!chatExists) {
      console.log('[GET /api/chats/[id]] Chat not found for chatId:', id);
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    // Security: Allow access if (1) user owns the chat OR (2) chat is public
    const hasAccess = chatExists.userId === userId || chatExists.isPublic;

    if (!hasAccess) {
      console.log('[GET /api/chats/[id]] Unauthorized access attempt for chatId:', id);
      return Response.json(
        { message: 'Unauthorized - this chat is private' },
        { status: 403 },
      );
    }

    console.log('[GET /api/chats/[id]] Chat found:', id, 'isPublic:', chatExists.isPublic);

    // Get messages for this chat
    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
    });

    return Response.json(
      {
        chat: chatExists,
        messages: chatMessages,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in getting chat by id: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const db = getDB();
    const { id } = await params;

    // Require authentication
    const userId = await requireUserId();

    // Security: Only allow deletion of user's own chats
    const chatExists = await db.query.chats.findFirst({
      where: and(eq(chats.id, id), eq(chats.userId, userId)),
    });

    if (!chatExists) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    // Delete chat and its messages
    await db.delete(chats).where(eq(chats.id, id)).execute();
    await db.delete(messages).where(eq(messages.chatId, id)).execute();

    return Response.json(
      { message: 'Chat deleted successfully' },
      { status: 200 },
    );
  } catch (err) {
    // Handle auth errors
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 },
      );
    }

    console.error('Error in deleting chat by id: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
