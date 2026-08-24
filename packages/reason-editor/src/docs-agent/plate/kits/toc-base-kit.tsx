import { BaseTocPlugin } from '@platejs/toc';

import { TocElementStatic } from '@/docs-agent/plate/ui/toc-node-static';

export const BaseTocKit = [BaseTocPlugin.withComponent(TocElementStatic)];
