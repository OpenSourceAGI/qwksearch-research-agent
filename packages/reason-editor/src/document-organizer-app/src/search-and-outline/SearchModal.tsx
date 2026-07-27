/**
 * @module SearchModal
 * @description Spotlight-style search and command palette (`Ctrl+K` / `⌘K`).
 * Searches documents by title and content, and provides quick-action commands
 * for settings, teams, and theme toggling.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, FileText, X, Settings, Users, Moon, Sun, Command } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../shared-components/dialog';
import { Input } from '../shared-components/input';
import { ScrollArea } from '../shared-components/scroll-area';
import { Document } from '../document-management/DocumentTree';
import { VisuallyHidden } from '../shared-components/visually-hidden';

/** Props for the {@link SearchModal} component. */
interface SearchModalProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to open or close the dialog. */
  onOpenChange: (open: boolean) => void;
  /** Full document list searched on every keystroke. */
  documents: Document[];
  /** Called when the user picks a document from the results. */
  onSelectDocument: (id: string) => void;
  /** Opens the settings dialog from a command action. */
  onOpenSettings?: () => void;
  /** Opens the teams/organization management dialog. */
  onOpenTeams?: () => void;
  /** Toggles the active UI theme. */
  onToggleTheme?: () => void;
  /** Currently active theme name; used to label the toggle action. */
  currentTheme?: string;
}

/** A document match returned by the full-text search. */
interface SearchResult {
  /** The matched document. */
  document: Document;
  /** Whether the match was found in the title or in the body content. */
  matchType: 'title' | 'content';
  /** Snippet of surrounding content shown below the title for content matches. */
  preview?: string;
}

/** A keyboard-accessible quick action shown in the command palette. */
interface CommandAction {
  /** Stable string identifier for the action. */
  id: string;
  /** Human-readable label displayed in the list. */
  label: string;
  /** Icon rendered to the left of the label. */
  icon: React.ReactNode;
  /** Invoked when the user clicks the action. */
  action: () => void;
  /** Additional keywords that make this action searchable. */
  keywords?: string[];
}

/**
 * Spotlight-style dialog that combines full-text document search with a
 * command palette. Auto-focuses on open, clears on close, and closes on `Esc`.
 */
export const SearchModal = ({
  open,
  onOpenChange,
  documents,
  onSelectDocument,
  onOpenSettings,
  onOpenTeams,
  onToggleTheme,
  currentTheme = 'light',
}: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Define command actions
  const commandActions = useMemo<CommandAction[]>(() => {
    const actions: CommandAction[] = [];

    if (onOpenSettings) {
      actions.push({
        id: 'settings',
        label: 'Open Settings',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          onOpenSettings();
          onOpenChange(false);
        },
        keywords: ['settings', 'preferences', 'config'],
      });
    }

    if (onOpenTeams) {
      actions.push({
        id: 'teams',
        label: 'Manage Teams',
        icon: <Users className="h-4 w-4" />,
        action: () => {
          onOpenTeams();
          onOpenChange(false);
        },
        keywords: ['teams', 'organization', 'members', 'collaborate'],
      });
    }

    if (onToggleTheme) {
      actions.push({
        id: 'theme',
        label: currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        action: () => {
          onToggleTheme();
        },
        keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      });
    }

    return actions;
  }, [onOpenSettings, onOpenTeams, onToggleTheme, currentTheme, onOpenChange]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    documents.forEach((doc) => {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const contentMatch = doc.content.toLowerCase().includes(lowerQuery);

      if (titleMatch) {
        results.push({
          document: doc,
          matchType: 'title',
        });
      } else if (contentMatch) {
        // Find the context around the match
        const contentLower = doc.content.toLowerCase();
        const matchIndex = contentLower.indexOf(lowerQuery);
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(doc.content.length, matchIndex + query.length + 40);
        const preview = doc.content.substring(start, end);

        results.push({
          document: doc,
          matchType: 'content',
          preview: (start > 0 ? '...' : '') + preview + (end < doc.content.length ? '...' : ''),
        });
      }
    });

    return results;
  }, [query, documents]);

  // Filter command actions based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commandActions;

    const lowerQuery = query.toLowerCase();
    return commandActions.filter((cmd) => {
      const matchesLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchesKeywords = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery));
      return matchesLabel || matchesKeywords;
    });
  }, [query, commandActions]);

  /**
   * Selects a document, closes the modal, and resets the query.
   *
   * @param id - ID of the document to open.
   */
  const handleSelect = (id: string) => {
    onSelectDocument(id);
    onOpenChange(false);
    setQuery('');
  };

  useEffect(() => {
    if (open) {
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Clear query when modal closes
      setQuery('');
    }
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const hasCommands = filteredCommands.length > 0;
  const hasResults = searchResults.length > 0;
  const showEmpty = query.trim() !== '' && !hasCommands && !hasResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-0 gap-0 max-h-[90vh] sm:max-h-[85vh]">
        <VisuallyHidden>
          <DialogTitle>Search notes and commands</DialogTitle>
        </VisuallyHidden>
        <DialogHeader className="px-4 py-4 border-b border-border">
          <div className="relative">
            <Command className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search notes or type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9 border-none shadow-none focus-visible:ring-0 text-sm sm:text-base"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] sm:max-h-[60vh]">
          {query.trim() === '' ? (
            <div className="py-2">
              {commandActions.length > 0 && (
                <>
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Actions
                    </h3>
                  </div>
                  {commandActions.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-muted-foreground">
                          {cmd.icon}
                        </div>
                        <span className="text-sm font-medium">{cmd.label}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Type to search across all your notes
                </p>
              </div>
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <div className="py-2">
              {hasCommands && (
                <>
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Commands
                    </h3>
                  </div>
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-muted-foreground">
                          {cmd.icon}
                        </div>
                        <span className="text-sm font-medium">{cmd.label}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {hasResults && (
                <>
                  {hasCommands && (
                    <div className="px-4 py-2 mt-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Notes
                      </h3>
                    </div>
                  )}
                  {searchResults.map((result) => (
                    <button
                      key={result.document.id}
                      onClick={() => handleSelect(result.document.id)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-1 truncate">
                            {result.document.title || 'Untitled'}
                          </h3>
                          {result.matchType === 'content' && result.preview && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {result.preview}
                            </p>
                          )}
                          {result.matchType === 'title' && result.document.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {result.document.content.substring(0, 120)}
                              {result.document.content.length > 120 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">Ctrl+K</kbd> to open • <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">ESC</kbd> to close
          </p>
          <p className="text-xs text-muted-foreground text-center sm:hidden">
            Tap <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">ESC</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
