/**
 * @fileoverview The research focus modes, as data.
 *
 * Shared by the composer's focus popover (`ResearchFocusToggleButton`) and the
 * spotlight palette's "Focus: …" actions, so a mode added here shows up in
 * both at once instead of drifting between two hand-kept lists.
 */
import { BadgePercent, Globe, Pencil, SwatchBook } from 'lucide-react';
import { FaReddit, FaYoutube } from 'react-icons/fa';
import type { ReactNode } from 'react';

export interface FocusMode {
  /** The value stored in chat state and sent with a search request. */
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export const focusModes: FocusMode[] = [
  {
    key: 'webSearch',
    title: 'All',
    description: 'Searches across all of the internet',
    icon: <Globe size={16} />,
  },
  {
    key: 'academicSearch',
    title: 'Academic',
    description: 'Search in published academic papers',
    icon: <SwatchBook size={16} />,
  },
  {
    key: 'writingAssistant',
    title: 'Writing',
    description: 'Chat without searching the web',
    icon: <Pencil size={16} />,
  },
  {
    key: 'wolframAlphaSearch',
    title: 'Wolfram Alpha',
    description: 'Computational knowledge engine',
    icon: <BadgePercent size={16} />,
  },
  {
    key: 'youtubeSearch',
    title: 'Youtube',
    description: 'Search and watch videos',
    icon: <FaYoutube className="h-[16px] w-auto mr-0.5" />,
  },
  {
    key: 'redditSearch',
    title: 'Reddit',
    description: 'Search for discussions and opinions',
    icon: <FaReddit className="h-[16px] w-auto mr-0.5" />,
  },
];
