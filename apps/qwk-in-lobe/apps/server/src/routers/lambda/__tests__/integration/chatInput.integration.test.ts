// @vitest-environment node
/**
 * The chat input's server path, end to end through the real routers and models:
 * load the user, resolve the inbox agent, send a message into a new topic, write
 * the assistant reply back (with usage, which recomputes the topic rollup), then
 * read the topic list and messages the way the chat page does.
 *
 * Runs on PGlite by default and on a local D1 with `TEST_DB_DRIVER=d1`, which is
 * what the `lobe` Worker uses (`DATABASE_DRIVER=d1`).
 */
import { type LobeChatDatabase } from '@lobechat/database';
import { messages, topics } from '@lobechat/database/schemas';
import { getTestDB } from '@lobechat/database/test-utils';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { agentRouter } from '../../agent';
import { aiChatRouter } from '../../aiChat';
import { messageRouter } from '../../message';
import { topicRouter } from '../../topic';
import { userRouter } from '../../user';
import { cleanupTestUser, createTestContext, createTestUser } from './setup';

let testDB: LobeChatDatabase;
vi.mock('@/database/core/db-adaptor', () => ({
  getServerDB: vi.fn(() => testDB),
  serverDB: new Proxy({}, { get: (_t, p) => Reflect.get(testDB, p) }),
}));

vi.mock('@/server/utils/scheduleAfterResponse', () => ({
  after: vi.fn((callback: () => void) => callback()),
}));

vi.mock('@/server/services/file', () => ({
  FileService: vi.fn().mockImplementation(() => ({
    getFullFileUrl: vi.fn().mockImplementation((path: string) => (path ? `/files${path}` : null)),
  })),
}));

describe('chat input (send a message)', () => {
  let userId: string;

  // The first getTestDB() builds the database (on D1: starts workerd and applies
  // every migrations/d1 file), which takes longer than the default hook timeout.
  beforeEach(async () => {
    testDB = await getTestDB();
    userId = await createTestUser(testDB);
  }, 120_000);

  afterEach(async () => {
    await cleanupTestUser(testDB, userId);
  });

  it('sends a message into a new topic and stores the reply', async () => {
    const ctx = createTestContext(userId);

    const state = await userRouter.createCaller(ctx).getUserState();
    expect(state.userId).toBe(userId);

    const inbox = await agentRouter.createCaller(ctx).getBuiltinAgent({ slug: 'inbox' });
    expect(inbox?.id).toBeTruthy();
    const agentId = inbox!.id as string;

    const sent = await aiChatRouter.createCaller(ctx).sendMessageInServer({
      agentId,
      newAssistantMessage: { model: 'openrouter/auto', provider: 'openrouter' },
      newTopic: { title: 'Hello there' },
      newUserMessage: { content: 'Hello there' },
    });

    expect(sent.isCreateNewTopic).toBe(true);
    expect(sent.topicId).toBeTruthy();
    expect(sent.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(sent.topics?.items.some((t) => t.id === sent.topicId)).toBe(true);

    // The client streams the model reply, then writes it back.
    await messageRouter.createCaller(ctx).update({
      agentId,
      id: sent.assistantMessageId,
      topicId: sent.topicId,
      value: {
        content: 'Hi! How can I help?',
        metadata: { usage: { totalInputTokens: 12, totalOutputTokens: 7, totalTokens: 19 } },
      },
    });

    const [assistant] = await testDB
      .select()
      .from(messages)
      .where(eq(messages.id, sent.assistantMessageId));
    expect(assistant.content).toBe('Hi! How can I help?');

    const [topic] = await testDB.select().from(topics).where(eq(topics.id, sent.topicId));
    expect(topic.totalTokens).toBe(19);

    const topicList = await topicRouter.createCaller(ctx).getTopics({ agentId });
    expect(topicList.items.map((t) => t.id)).toContain(sent.topicId);

    const history = await messageRouter
      .createCaller(ctx)
      .getMessages({ agentId, topicId: sent.topicId });
    expect(history.map((m) => m.content)).toEqual(['Hello there', 'Hi! How can I help?']);

    // A second message in the same topic.
    const second = await aiChatRouter.createCaller(ctx).sendMessageInServer({
      agentId,
      newAssistantMessage: { model: 'openrouter/auto', provider: 'openrouter' },
      newUserMessage: { content: 'And again', parentId: sent.assistantMessageId },
      topicId: sent.topicId,
    });
    expect(second.isCreateNewTopic).toBe(false);
    expect(second.messages.filter((m) => m.role === 'user')).toHaveLength(2);
  }, 60_000);
});
