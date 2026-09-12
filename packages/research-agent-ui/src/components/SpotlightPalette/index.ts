/**
 * @fileoverview The Ctrl-Space spotlight palette — a single bar that searches
 * chats, pages, settings and actions, and asks the research agent anything
 * that matches none of them.
 */
export { SpotlightPalette, openSpotlight } from './SpotlightPalette';
export {
  buildActionItems,
  buildChatItems,
  buildPageItems,
  buildSearchItem,
  buildSettingItems,
} from './spotlightItems';
export type {
  SpotlightContext,
  SpotlightIcon,
  SpotlightItem,
} from './spotlightItems';
export {
  matchSpotlight,
  parsePrefix,
  prefixForSource,
  SPOTLIGHT_PREFIXES,
} from './spotlightMatch';
export type {
  SpotlightMatch,
  SpotlightMatchable,
  SpotlightPrefix,
  SpotlightSource,
} from './spotlightMatch';
export { SPOTLIGHT_LINKS, type SpotlightLink } from './spotlightLinks';
