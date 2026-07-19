/**
 * @module RightPanel
 * @description Collapsible right-side panel that toggles between the AI Suggestions
 * view and the document Outline (table-of-contents) view.
 */
import type { TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin';
import { OutlineView } from '../search/OutlineView';
import { AIRewriteSuggestion } from '../features/AIRewriteSuggestion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, X, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

/** Props for the {@link RightPanel} component. */
interface RightPanelProps {
  /** Whether the AI suggestion panel is visible. */
  showAiPanel: boolean;
  /** Setter that shows or hides the AI panel. */
  setShowAiPanel: (show: boolean) => void;
  /** True while an AI rewrite is pending. */
  isAiLoading: boolean;
  aiSuggestion: {
    originalText: string;
    suggestedText: string;
    range: { from: number; to: number };
    mode?: string;
  } | null;
  onAiApprove: () => void;
  onAiReject: () => void;
  onAiRegenerate: (mode: any) => void;
  headings: TableOfContentsEntry[];
  searchQuery: string;
  onNavigate: (key: string) => void;
  documentContent?: string;
}

/**
 * Right-hand side panel that either shows AI rewrite suggestions or the document
 * heading outline depending on `showAiPanel`.
 */
export function RightPanel({
  showAiPanel,
  setShowAiPanel,
  isAiLoading,
  aiSuggestion,
  onAiApprove,
  onAiReject,
  onAiRegenerate,
  headings,
  searchQuery,
  onNavigate,
  documentContent = '',
}: RightPanelProps) {
  const [outlineFilter, setOutlineFilter] = useState('');

  // Build per-heading body text from HTML so we can search inside sections
  const sectionBodies = useMemo<string[]>(() => {
    if (!documentContent) return [];
    const doc = new DOMParser().parseFromString(documentContent, 'text/html');
    const bodies: string[] = [];
    let currentBody = '';
    let headingIndex = -1;
    for (const el of Array.from(doc.body.children)) {
      if (/^h[1-6]$/i.test(el.tagName)) {
        if (headingIndex >= 0) bodies[headingIndex] = currentBody;
        headingIndex++;
        currentBody = '';
      } else if (headingIndex >= 0) {
        currentBody += ' ' + (el.textContent || '');
      }
    }
    if (headingIndex >= 0) bodies[headingIndex] = currentBody;
    return bodies;
  }, [documentContent]);

  // Filter headings: match by heading text OR body text in that section
  const filteredHeadings = useMemo<TableOfContentsEntry[]>(() => {
    const q = outlineFilter.trim().toLowerCase();
    if (!q) return headings;
    return headings.filter(([, text], i) =>
      text.toLowerCase().includes(q) ||
      (sectionBodies[i] || '').toLowerCase().includes(q)
    );
  }, [outlineFilter, headings, sectionBodies]);

  return (
    <div className="h-full border-l border-sidebar-border bg-sidebar-background">
      {showAiPanel ? (
        <div className="h-full overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-sidebar-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sidebar-foreground">AI Suggestions</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setShowAiPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {isAiLoading ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Generating AI suggestion...</p>
                </div>
              </div>
            ) : aiSuggestion ? (
              <AIRewriteSuggestion
                originalText={aiSuggestion.originalText}
                suggestedText={aiSuggestion.suggestedText}
                onApprove={onAiApprove}
                onReject={onAiReject}
                onRegenerate={onAiRegenerate}
                currentMode={aiSuggestion.mode}
                isLoading={false}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <p className="text-sm text-muted-foreground">Select text and click the AI button to get suggestions</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-sidebar-border">
            <h3 className="text-sm font-semibold text-sidebar-foreground mb-2">Outline</h3>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={outlineFilter}
                onChange={(e) => setOutlineFilter(e.target.value)}
                placeholder="Filter headings & text…"
                className="h-7 pl-7 pr-7 text-xs"
              />
              {outlineFilter && (
                <button
                  onClick={() => setOutlineFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <OutlineView
              headings={filteredHeadings}
              searchQuery={outlineFilter}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
