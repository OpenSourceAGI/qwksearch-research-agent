import { type SharedTopicData } from '@/types/topic';

export const buildTopicByline = (data: SharedTopicData) => {
  const isInboxAgent = !data.groupId && data.agentMeta?.slug === 'inbox';

  return data.groupMeta?.title || (isInboxAgent ? 'Qwk AI' : data.agentMeta?.title);
};
