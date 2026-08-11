'use client';

import { TogglePlugin } from '@platejs/toggle/react';

import { IndentKit } from '@/docs-agent/plate/kits/indent-kit';
import { ToggleElement } from '@/docs-agent/plate/ui/toggle-node';

export const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];
