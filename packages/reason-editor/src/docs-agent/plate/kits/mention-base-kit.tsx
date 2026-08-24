import { BaseMentionPlugin } from '@platejs/mention';

import { MentionElementStatic } from '@/docs-agent/plate/ui/mention-node-static';

export const BaseMentionKit = [
  BaseMentionPlugin.withComponent(MentionElementStatic),
];
