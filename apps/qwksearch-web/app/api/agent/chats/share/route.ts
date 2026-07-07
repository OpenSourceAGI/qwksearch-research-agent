/**
 * @fileoverview Chat share endpoint. POST makes a chat public and returns its shareable URL.
 */
import { getDB } from '@/lib/database';
import { chats } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth/session';

export const POST = async (req: Request) => {
  try {
    const db = getDB();
    const { chatId } = await req.json();

    if (!chatId) {
      return Response.json(
        { success: false, error: 'Chat ID is required' },
        { status: 400 },
      );
    }

    // Require authentication - only chat owner can make it public
    const userId = await requireUserId();

    // Verify the chat exists and belongs to the user
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return Response.json(
        { success: false, error: 'Chat not found' },
        { status: 404 },
      );
    }

    if (chat.userId !== userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 },
      );
    }

    // Make the chat public
    await db
      .update(chats)
      .set({ isPublic: 1 })
      .where(eq(chats.id, chatId))
      .execute();

    // Generate the shareable URL
    const url = new URL(req.url);
    const shareUrl = `${url.origin}/c/${chatId}`;

    return Response.json({
      success: true,
      data: {
        chatId,
        shareUrl,
      },
    });
  } catch (err) {
    // Handle auth errors
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    console.error('Error in making chat public: ', err);
    return Response.json(
      { success: false, error: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
