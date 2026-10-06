/** The page opened once, on first install. */
export const WELCOME_PAGE = 'welcome.html';

type InstallBrowser = {
  runtime: { getURL: (path: string) => string };
  tabs: { create: (options: { url: string }) => Promise<unknown> | unknown };
};

/**
 * Opens the welcome page on a fresh install only. Updates, reloads and browser
 * updates must never open a tab.
 */
export async function handleInstalled(
  browser: InstallBrowser,
  details: { reason: string }
): Promise<void> {
  if (details.reason !== 'install') return;
  await browser.tabs.create({ url: browser.runtime.getURL(WELCOME_PAGE) });
}

export interface Feature {
  title: string;
  description: string;
  /** How to reach it, written as the steps a person takes. */
  access: string;
  /** Keyboard shortcuts, shown as keys. Customisable at chrome://extensions/shortcuts. */
  keys?: string[];
}

export interface FeatureGroup {
  heading: string;
  features: Feature[];
}

/** Every feature, grouped, with how to get to it. Rendered by the welcome page. */
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    heading: 'Get started',
    features: [
      {
        title: 'Side panel',
        description: 'Everything below lives in one sidebar beside the page you are reading.',
        access: 'Click the QwkSearch icon in the toolbar (pin it from the extensions menu).',
        keys: ['Ctrl+Q', '⌘B on Mac'],
      },
      {
        title: 'Log in to QwkSearch',
        description: 'Use your QwkSearch account, its saved chats and its settings from the extension.',
        access: 'Choose Log in at the top right of the side panel, or the button on this page.',
      },
      {
        title: 'Open as a full tab',
        description: 'Use the whole extension in a full browser tab instead of the sidebar. Off by default.',
        access: 'Side panel → Settings (gear) → "Open in a full tab", or the pop-out button for a one-off.',
      },
    ],
  },
  {
    heading: 'Organize your tabs',
    features: [
      {
        title: 'Tab organizer',
        description: 'See open tabs by window, drag them into order, and save them as collections in spaces.',
        access: 'Side panel → Organize, the first tab in the header.',
      },
      {
        title: 'Full library',
        description: 'The organizer with room to spread out: every space, collection, group and note.',
        access: 'Organize → Full library, or the shortcut.',
        keys: ['Alt+Shift+Q'],
      },
      {
        title: 'Save, stash and switch',
        description: 'Save tabs to a collection, stash them to close and come back later, or switch a window to another collection.',
        access: 'Organize → Save tabs beside Open tabs, then pick Save or Stash.',
      },
      {
        title: 'Visual tab switcher',
        description: 'Previews of every tab in the window over the current page.',
        access: 'Press the shortcut on any page.',
        keys: ['Alt+Q'],
      },
      {
        title: 'Search tabs, collections and commands',
        description: 'Find an open tab, a saved link or a recently closed page. Type @ for a collection, / for an action.',
        access: 'Press the shortcut, or type "tabs" and a space in the address bar.',
        keys: ['Alt+Shift+K'],
      },
      {
        title: 'Group, sort and clean up',
        description: 'Group tabs by website, sort them, close duplicates, or let AI group them by topic.',
        access: 'Organize → the tools beside Open tabs. Connect an AI provider in Organize → Settings → AI connection.',
      },
      {
        title: 'Recovery and backups',
        description: 'Undo changes, reopen closed pages, restore snapshots, and export or import your library.',
        access: 'Organize → Recovery, or Organize → Settings → Export & import.',
      },
    ],
  },
  {
    heading: 'Research with AI',
    features: [
      {
        title: 'Ask AI (LLM button)',
        description: 'Chat with the QwkSearch research agent, including about your open tabs or their page content.',
        access: 'Click the sparkle LLM button at the top of the side panel.',
      },
      {
        title: 'Search inside open tabs',
        description: 'Search the text of every open page, not just titles, or search the web from the same box.',
        access: 'Side panel → Tabs → search box.',
      },
      {
        title: 'Search selected text',
        description: 'Search the web for any text you select; press again on a results page to open the first result.',
        access: 'Select text on a page and press the backtick key (`). Add Shift to open it in the background. Or right-click → Search With…',
        keys: ['`'],
      },
      {
        title: 'Reading mode',
        description: 'Strip a page down to its main content, with the citation, including PDFs.',
        access: 'Press the backtick key (`) with nothing selected, or right-click → Reading Mode.',
      },
      {
        title: 'YouTube transcript',
        description: 'A synced transcript beside every video: follow along, click to seek, search and copy.',
        access: 'Open any YouTube video; the transcript appears beside it.',
      },
      {
        title: 'QwkSearch in the address bar',
        description: 'Search QwkSearch straight from the address bar (Chrome).',
        access: 'Type "qwk" and a space in the address bar.',
      },
    ],
  },
  {
    heading: 'Browse your history',
    features: [
      {
        title: 'History',
        description: 'Recently visited pages: open one again or remove it from history.',
        access: 'Side panel → History.',
      },
      {
        title: 'Favorites',
        description: 'Recent bookmarks and your bookmark folders: open, rename or remove them.',
        access: 'Side panel → Favorites.',
      },
      {
        title: 'Downloads',
        description: 'Recent downloads: open a file, show it in its folder, or clear it from the list.',
        access: 'Side panel → Downloads.',
      },
    ],
  },
];
