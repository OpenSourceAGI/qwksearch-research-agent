/**
 * Default quick-commands shown in the Ai extension's "Ask AI anything…"
 * menu. Ported from the writing-assistant command set in the old
 * `packages/reason-editor/ai` (Plate.js) source. Overridable via
 * `Ai.configure({ commands })`.
 */

import { CheckCheck, Feather, Minus, Plus, SmilePlus, Sparkles } from 'lucide-react';

import type { AiCommandDefinition } from './types';

export const DEFAULT_AI_COMMANDS: AiCommandDefinition[] = [
  {
    id: 'improve',
    label: 'Improve writing',
    description: 'Rewrite for clarity and flow',
    icon: Sparkles,
    prompt: 'Improve the writing quality of the selected text while preserving its original meaning and tone.',
  },
  {
    id: 'emojify',
    label: 'Emojify',
    description: 'Add relevant emoji',
    icon: SmilePlus,
    prompt: 'Add relevant emoji throughout the selected text without changing the wording.',
  },
  {
    id: 'longer',
    label: 'Make longer',
    description: 'Expand with more detail',
    icon: Plus,
    prompt: 'Expand the selected text with more detail and supporting context while keeping the same tone.',
  },
  {
    id: 'shorter',
    label: 'Make shorter',
    description: 'Trim to the essentials',
    icon: Minus,
    prompt: 'Make the selected text more concise, removing redundancy while preserving all key points.',
  },
  {
    id: 'fix',
    label: 'Fix spelling & grammar',
    description: 'Correct mistakes only',
    icon: CheckCheck,
    prompt: 'Fix all spelling and grammar mistakes in the selected text without changing its meaning or style.',
  },
  {
    id: 'simplify',
    label: 'Simplify language',
    description: 'Plainer words, shorter sentences',
    icon: Feather,
    prompt: 'Simplify the language of the selected text so it is easier to understand, using plainer words and shorter sentences.',
  },
];
