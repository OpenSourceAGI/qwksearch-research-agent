/**
 * @module FindReplaceAllDialog
 * @description Dialog that searches and replaces text across every document
 * in the workspace at once, as opposed to the in-editor Find & Replace toolbar
 * popover which only operates on the document currently open in the editor.
 */
import { useMemo, useState } from 'react';
import { Replace, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../app-ui/dialog';
import { Input } from '../app-ui/input';
import { Button } from '../app-ui/button';
import { Switch } from '../app-ui/switch';
import { ScrollArea } from '../app-ui/scroll-area';
import { Document } from '../documents/DocumentTree';
import { searchAllDocuments, type ReplaceAllResult } from './findReplaceAllDocs';

/** Props for the {@link FindReplaceAllDialog} component. */
interface FindReplaceAllDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to open or close the dialog. */
  onOpenChange: (open: boolean) => void;
  /** Full document list to search across. */
  documents: Document[];
  /** ID of the document currently open in the editor, if any. Included in replace-all; its editor reloads to reflect the change. */
  activeDocId: string | null;
  /**
   * Replaces every occurrence of `query` with `replacement` across all
   * documents, including the one currently open in the editor, and returns a
   * summary of the change.
   */
  onReplaceAll: (
    query: string,
    replacement: string,
    options: { caseSensitive?: boolean }
  ) => ReplaceAllResult;
}

/**
 * Dialog for finding and replacing text across the entire document workspace.
 * Shows a live per-document match preview as the user types, and requires an
 * explicit confirmation click before applying the replacement.
 */
export const FindReplaceAllDialog = ({
  open,
  onOpenChange,
  documents,
  activeDocId,
  onReplaceAll,
}: FindReplaceAllDialogProps) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<ReplaceAllResult | null>(null);

  const matches = useMemo(
    () => searchAllDocuments(documents, query, { caseSensitive }),
    [documents, query, caseSensitive]
  );

  const totalMatches = matches.reduce((sum, m) => sum + m.matchCount, 0);

  const reset = () => {
    setQuery('');
    setReplacement('');
    setConfirming(false);
    setLastResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleReplaceAll = () => {
    const result = onReplaceAll(query, replacement, { caseSensitive });
    setLastResult(result);
    setConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Find & Replace in All Docs</DialogTitle>
          <DialogDescription>
            Search and replace text across every document in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Find..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setConfirming(false);
              setLastResult(null);
            }}
          />
          <Input
            placeholder="Replace with..."
            value={replacement}
            onChange={(e) => {
              setReplacement(e.target.value);
              setConfirming(false);
              setLastResult(null);
            }}
          />

          <div className="flex items-center gap-2">
            <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} />
            <span className="text-sm text-muted-foreground">Case sensitive</span>
          </div>
        </div>

        {query.trim() !== '' && (
          <ScrollArea className="max-h-64 border rounded-md">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No matches found for "{query}"
              </p>
            ) : (
              <ul>
                {matches.map((m) => (
                  <li
                    key={m.documentId}
                    className="px-3 py-2 border-b border-border last:border-0 flex items-start gap-2"
                  >
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{m.title}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {m.matchCount} match{m.matchCount === 1 ? '' : 'es'}
                          {m.documentId === activeDocId ? ' (currently open)' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{m.snippet}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        {lastResult && (
          <p className="text-sm text-foreground">
            Replaced {lastResult.replacedCount} occurrence{lastResult.replacedCount === 1 ? '' : 's'} in{' '}
            {lastResult.changedIds.length} document{lastResult.changedIds.length === 1 ? '' : 's'}.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReplaceAll}>
                Confirm replace in {matches.length} doc{matches.length === 1 ? '' : 's'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setConfirming(true)}
              disabled={totalMatches === 0}
            >
              <Replace className="h-4 w-4" />
              Replace All ({totalMatches})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
