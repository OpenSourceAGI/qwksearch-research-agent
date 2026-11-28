/**
 * @fileoverview The slash command registry.
 *
 * Each command either **inserts a template** (`insertText`: the user finishes
 * the sentence and sends it) or **runs immediately** (`run`: the `/token` is
 * removed from the input and the action fires). Which is which:
 *
 * | Command        | Behaviour                                              |
 * | -------------- | ------------------------------------------------------ |
 * | `/search`      | template: "Search the web for "                        |
 * | `/summarize`   | template: the app's default summarize prompt           |
 * | `/explain`     | template: "Explain in simple terms: "                  |
 * | `/compare`     | template: "Compare the following and tabulate the differences: " |
 * | `/factcheck`   | template: "Fact-check this claim using reliable sources: " |
 * | `/new`         | runs: starts a fresh chat                              |
 * | `/clear`       | runs: empties the input and any attachments            |
 * | `/settings`    | runs: opens settings                                   |
 * | `/incognito`   | runs: toggles incognito (not saved to history)         |
 * | `/upload`      | runs: opens the file picker                            |
 * | `/voice`       | runs: starts or stops voice input (when supported)     |
 * | `/focus-<key>` | runs: one per research focus mode (shared registry)    |
 *
 * Pure of hooks: the composer supplies the capabilities through
 * {@link SlashCommandContext}, so the registry is testable and reusable by any
 * other input that wants the same menu.
 */
import {
  Eraser,
  EyeOff,
  GitCompare,
  Eye,
  FileText,
  Lightbulb,
  Mic,
  Paperclip,
  Plus,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { focusModes } from '../SearchConfig/focusModes';
import type { SlashItem } from './types';

/** What the composer lets slash commands do. */
export interface SlashCommandContext {
  newChat: () => void;
  /** Empty the input box and drop pending attachments. */
  clearComposer: () => void;
  openSettings: () => void;
  openFilePicker: () => void;
  incognito: boolean;
  setIncognito: (value: boolean) => void;
  focusMode: string;
  setFocusMode: (key: string) => void;
  /** Prompt inserted by `/summarize`. */
  summarizePrompt: string;
  /** Omit when the browser has no speech input; `/voice` is then hidden. */
  toggleVoice?: () => void;
  isListening?: boolean;
}

const ICON = 'h-4 w-4';

/** Builds the command rows, in the order they show for an empty query. */
export function buildSlashCommands(ctx: SlashCommandContext): SlashItem[] {
  const items: SlashItem[] = [
    {
      id: 'cmd:search',
      kind: 'command',
      name: 'Search',
      description: 'Search the web and answer with sources',
      keywords: 'web research find look up',
      hint: '/search',
      icon: <Search className={ICON} />,
      insertText: 'Search the web for ',
    },
    {
      id: 'cmd:summarize',
      kind: 'command',
      name: 'Summarize',
      description: 'Summarize a page, document or topic',
      keywords: 'tldr bullet points digest',
      hint: '/summarize',
      icon: <FileText className={ICON} />,
      insertText: `${ctx.summarizePrompt.replace(/[\s:]+$/, '')}: `,
    },
    {
      id: 'cmd:explain',
      kind: 'command',
      name: 'Explain',
      description: 'Explain a concept in simple terms',
      keywords: 'eli5 teach understand',
      hint: '/explain',
      icon: <Lightbulb className={ICON} />,
      insertText: 'Explain in simple terms: ',
    },
    {
      id: 'cmd:compare',
      kind: 'command',
      name: 'Compare',
      description: 'Compare options side by side in a table',
      keywords: 'versus vs difference table',
      hint: '/compare',
      icon: <GitCompare className={ICON} />,
      insertText: 'Compare the following and tabulate the differences: ',
    },
    {
      id: 'cmd:factcheck',
      kind: 'command',
      name: 'Fact-check',
      description: 'Verify a claim against reliable sources',
      keywords: 'verify claim true false sources',
      hint: '/factcheck',
      icon: <ShieldCheck className={ICON} />,
      insertText: 'Fact-check this claim using reliable sources: ',
    },
    {
      id: 'cmd:new',
      kind: 'command',
      name: 'New chat',
      description: 'Start a fresh conversation',
      keywords: 'reset blank conversation',
      hint: '/new',
      icon: <Plus className={ICON} />,
      run: ctx.newChat,
    },
    {
      id: 'cmd:clear',
      kind: 'command',
      name: 'Clear',
      description: 'Empty the input and remove attachments',
      keywords: 'erase reset input attachments',
      hint: '/clear',
      icon: <Eraser className={ICON} />,
      run: ctx.clearComposer,
    },
    {
      id: 'cmd:settings',
      kind: 'command',
      name: 'Settings',
      description: 'Models, connectors, search sources and preferences',
      keywords: 'preferences configure options',
      hint: '/settings',
      icon: <Settings className={ICON} />,
      run: ctx.openSettings,
    },
    {
      id: 'cmd:incognito',
      kind: 'command',
      name: ctx.incognito ? 'Turn off incognito' : 'Turn on incognito',
      description: 'Stop saving this conversation to history',
      keywords: 'private history',
      hint: '/incognito',
      icon: ctx.incognito ? <Eye className={ICON} /> : <EyeOff className={ICON} />,
      run: () => ctx.setIncognito(!ctx.incognito),
    },
    {
      id: 'cmd:upload',
      kind: 'command',
      name: 'Upload file',
      description: 'Attach a document or image from this device',
      keywords: 'attach pdf docx image',
      hint: '/upload',
      icon: <Paperclip className={ICON} />,
      run: ctx.openFilePicker,
    },
  ];

  if (ctx.toggleVoice) {
    items.push({
      id: 'cmd:voice',
      kind: 'command',
      name: ctx.isListening ? 'Stop voice input' : 'Voice input',
      description: 'Dictate your question with the microphone',
      keywords: 'speak dictate microphone',
      hint: '/voice',
      icon: <Mic className={ICON} />,
      run: ctx.toggleVoice,
    });
  }

  for (const mode of focusModes) {
    items.push({
      id: `cmd:focus:${mode.key}`,
      kind: 'command',
      name: `Focus: ${mode.title}`,
      description: mode.description,
      keywords: `focus mode ${mode.key}`,
      hint: ctx.focusMode === mode.key ? 'current' : '/focus',
      icon: mode.icon,
      run: () => ctx.setFocusMode(mode.key),
    });
  }

  return items;
}
