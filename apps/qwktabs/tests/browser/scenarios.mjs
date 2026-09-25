
export const scenarios = {
  "library-recovery": {
    "file": "library-recovery", "run": "checkLibraryRecovery",
    "description": "Library startup and live refresh recover from a failed load"
  },
  "group-between-tabs": {
    "file": "group-between-tabs", "run": "checkGroupBetweenTabs",
    "description": "Whole groups between loose tabs; mixed order, copy, Undo and reload"
  },
  "onboarding": {
    "file": "onboarding", "run": "checkOnboarding",
    "description": "First-run guide, video playback, placement, transitions, replay and uninstall",
    "localServices": true,
    "site": true
  },
  "switcher-close": {
    "file": "switcher-close", "run": "checkSwitcherClose",
    "description": "Alt+W, group closing, focus, Undo and host-page continuation",
    "localServices": true
  },
  "ungrouped-first": {
    "file": "ungrouped-first",
    "run": "checkUngroupedFirst",
    "description": "Ungrouped tabs before groups; native sort and Undo",
    "pathTitles": true
  },
  "collection-drag": {
    "file": "collection-drag",
    "run": "checkCollectionDrag",
    "description": "Collection insertion across columns, rows and zoom"
  },
  "saved-drag": {
    "file": "saved-drag",
    "run": "checkSavedDrag",
    "description": "Saved link and group insertion; neutral drop zones"
  },
  "rename-selection": {
    "file": "rename-selection",
    "run": "checkRenameSelection",
    "description": "Mouse text selection during collection and group renaming"
  },
  "mixed-drag": {
    "file": "mixed-drag",
    "run": "checkMixedDrag",
    "description": "Sidebar group boundaries, scrolling and zoom"
  },
  "drag-placement": {
    "file": "drag-placement",
    "run": "checkDragPlacement",
    "description": "Cross-list ordering, group identity and Ctrl-copy"
  },
  "native-drag": {
    "file": "native-drag",
    "run": "checkNativeDrag",
    "description": "Native tab moves, grouping and Undo"
  },
  "messages": {
    "file": "messages",
    "run": "checkMessages",
    "description": "Error feedback, silent no-ops and Undo"
  },
  "collection-preview": {
    "file": "collection-preview",
    "run": "checkCollectionPreview",
    "description": "Preview limits, expansion and keyboard focus"
  },
  "notion-library": {
    "file": "notion-library",
    "run": "checkNotionLibrary",
    "description": "Local Notion export, pause, resume and deduplication",
    "localServices": true
  },
  "dialog-polish": {
    "file": "dialog-polish",
    "run": "checkDialogPolish",
    "description": "Import/export and privacy dialogs across layouts"
  },
  "lazy-open": {
    "file": "lazy-open",
    "run": "checkLazyOpen",
    "description": "Deferred opening, window scope and timeline"
  },
  "save-flow": {
    "file": "save-flow",
    "run": "checkSaveFlow",
    "description": "Save, adoption, form state and AI naming",
    "localServices": true
  },
  "topic-regroup": {
    "file": "topic-regroup",
    "run": "checkTopicRegroup",
    "description": "AI grouping, selection scope and Undo",
    "localServices": true
  },
  "selection-hover": {
    "file": "selection-hover",
    "run": "checkSelectionHover",
    "description": "Selection controls, link removal and Undo"
  },
  "toolbar-identity": {
    "file": "toolbar-identity",
    "run": "checkToolbarIdentity",
    "description": "Toolbar icon and page identity"
  },
  "model-defaults": {
    "file": "model-defaults",
    "run": "checkModelDefaults",
    "description": "Provider defaults and saved settings"
  },
  "organisation": {
    "file": "organisation",
    "run": "checkOrganisation",
    "description": "Legacy settings migration and built-in grouping",
    "localServices": true
  },
  "stash-safety": {
    "file": "stash-safety",
    "run": "checkStashSafety",
    "description": "Partial and full stash preserve saved collections"
  },
  "recovery": {
    "file": "recovery-ui",
    "run": "checkRecovery",
    "description": "Storage failure, worker interruption and database migration"
  },
  "favicon-stability": {
    "file": "favicon-stability",
    "run": "checkFaviconStability",
    "description": "Cached favicon recovery and fallback"
  },
  "library-search": {
    "file": "library-search",
    "run": "checkLibrarySearch",
    "description": "Library, recent tabs and optional history search",
    "permissions": [
      "history"
    ]
  },
  "workspace-removal": {
    "file": "workspace-removal",
    "run": "checkWorkspaceRemoval",
    "description": "Space deletion, cancellation and recovery"
  },
  "notes": {
    "file": "notes-ux",
    "run": "checkNotesUX",
    "description": "Inline note editing, persistence and Undo"
  },
  "native-bookmarks": {
    "file": "native-bookmarks",
    "run": "checkBookmarks",
    "description": "Native bookmark import and export",
    "permissions": [
      "bookmarks"
    ]
  },
  "scale": {
    "file": "scale",
    "run": "checkScale",
    "description": "Large library import, storage and bounded rendering"
  },
  "bulk": {
    "file": "bulk",
    "run": "checkBulk",
    "description": "Bulk open, cancellation and modal lifecycle"
  },
  "media-stability": {
    "file": "media-stability",
    "run": "checkMediaStability",
    "description": "Preview races, cache recovery and strict CSP",
    "localServices": true
  },
  "smoke": {
    "file": "smoke",
    "run": "checkSmoke",
    "description": "Saving, deferred resume, persistence and responsive library"
  },
  "overlay": {
    "file": "overlay-fixture",
    "run": "checkOverlayFixture",
    "description": "Switcher, commands, previews and protected-page fallback",
    "localServices": true
  },
  "overlay-ai": {
    "file": "overlay-fixture",
    "run": "checkOverlayAIFixture",
    "description": "Injected AI grouping, local provider and permission fallback",
    "localServices": true
  },
  "previews": {
    "file": "overlay-fixture",
    "run": "checkPreviewFixture",
    "description": "Real capture, preview storage limits and private-tab exclusion",
    "localServices": true
  }
};
