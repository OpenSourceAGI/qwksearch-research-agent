import { BaseTogglePlugin } from '@platejs/toggle';

import { ToggleElementStatic } from '@/docs-agent/plate/ui/toggle-node-static';

export const BaseToggleKit = [
  BaseTogglePlugin.withComponent(ToggleElementStatic),
];
