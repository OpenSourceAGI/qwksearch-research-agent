import { BaseLinkPlugin } from '@platejs/link';

import { LinkElementStatic } from '@/docs-agent/plate/ui/link-node-static';

export const BaseLinkKit = [BaseLinkPlugin.withComponent(LinkElementStatic)];
