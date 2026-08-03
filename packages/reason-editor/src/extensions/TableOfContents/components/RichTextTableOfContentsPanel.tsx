/**
 * Toolbar control (React) for the TableOfContents extension, which adds an automatic table of contents. Renders the button and dispatches the matching editor command when activated.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ListTree } from 'lucide-react';

interface PanelHeading {
  level: number;
  text: string;
  pos: number;
  index: number;
}

interface RichTextTableOfContentsPanelProps {
  editor: any;
  onClose: () => void;
  /** Initial max heading depth to unfold (1-4). Defaults to 3. */
  defaultLevel?: number;
}

const LEVELS = [1, 2, 3, 4] as const;

/**
 * Floating Table of Contents panel.
 *
 * Includes a filter box to search headings by title and a level selector
 * to choose how deep the outline is unfolded (H1 → H4). Clicking an entry
 * scrolls the matching heading into view using its ProseMirror position, so
 * it works even though headings don't carry DOM ids.
 */
export function RichTextTableOfContentsPanel({
  editor,
  onClose,
  defaultLevel = 3,
}: RichTextTableOfContentsPanelProps) {
  const [headings, setHeadings] = useState<PanelHeading[]>([]);
  const [filter, setFilter] = useState('');
  const [maxLevel, setMaxLevel] = useState<number>(defaultLevel);
  const [activePos, setActivePos] = useState<number | null>(null);

  // Rebuild the heading list whenever the document changes.
  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const items: PanelHeading[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level,
            text: node.textContent,
            pos,
            index: items.length,
          });
        }
      });
      setHeadings(items);
    };

    updateHeadings();
    editor.on('update', updateHeadings);
    return () => editor.off('update', updateHeadings);
  }, [editor]);

  const visibleHeadings = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return headings.filter(
      (h) =>
        h.level <= maxLevel &&
        (query === '' || h.text.toLowerCase().includes(query)),
    );
  }, [headings, filter, maxLevel]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;
      const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
      if (dom && typeof dom.scrollIntoView === 'function') {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      editor.chain().focus().setTextSelection(pos + 1).run();
      setActivePos(pos);
    },
    [editor],
  );

  return createPortal(
    <div className="fixed right-4 top-24 z-50 flex w-72 max-h-[70vh] flex-col rounded-lg border border-gray-200/60 bg-white/80 shadow-xl backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ListTree size={15} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Table of Contents
          </span>
        </div>
        <button
          onClick={onClose}
          title="Hide table of contents"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      {/* Filter box */}
      <div className="border-b border-gray-100 px-3 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
          <Search size={13} className="shrink-0 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter headings…"
            className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              title="Clear filter"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Unfolding level selector (H1 – H4) */}
        <div className="mt-2 flex items-center gap-1">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Level
          </span>
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setMaxLevel(level)}
              title={`Unfold headings up to H${level}`}
              className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${
                maxLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800'
              }`}
            >
              H{level}
            </button>
          ))}
        </div>
      </div>

      {/* Heading list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleHeadings.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-gray-400">
            {headings.length === 0
              ? 'No headings yet.'
              : 'No headings match your filter.'}
          </div>
        ) : (
          visibleHeadings.map((h) => (
            <button
              key={h.pos}
              onClick={() => scrollToHeading(h.pos)}
              style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
              className={`block w-full truncate rounded py-1.5 pr-2 text-left text-xs transition-colors ${
                activePos === h.pos
                  ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
              }`}
            >
              {h.text || `Heading ${h.level}`}
            </button>
          ))
        )}
      </nav>
    </div>,
    document.body,
  );
}

export default RichTextTableOfContentsPanel;
