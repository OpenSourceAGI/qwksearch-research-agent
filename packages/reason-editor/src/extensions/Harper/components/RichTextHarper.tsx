/**
 * Toolbar control (React) for the Harper extension, which adds the Harper grammar and spell checker. Renders the button and dispatches the matching editor command when activated.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';

import { cn } from '@/lib/utils';

import { getHarperState, type HarperIssue } from '../Harper';

interface ActivePopover {
  issue: HarperIssue;
  top: number;
  left: number;
}

export interface RichTextHarperProps {
  /** The editor whose Harper issues this tooltip surfaces. */
  editor: Editor | null;
  /** Extra class names for the popover container. */
  className?: string;
}

const CLOSE_DELAY = 120;

/**
 * Hover/click suggestion tooltip for Harper proofing issues.
 *
 * It listens for pointer events on issue decorations rendered by the Harper
 * extension and shows the issue message plus actions to apply a suggestion or
 * dismiss the issue. Pass the same `editor` instance the extension is on.
 */
export function RichTextHarper({ editor, className }: RichTextHarperProps) {
  const [active, setActive] = useState<ActivePopover | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setActive(null), CLOSE_DELAY);
  }, [cancelClose]);

  const openForElement = useCallback(
    (el: HTMLElement) => {
      if (!editor) return;
      const id = el.getAttribute('data-harper-id');
      if (!id) return;
      const issue = getHarperState(editor.state)?.issues.get(id);
      if (!issue) return;

      const rect = el.getBoundingClientRect();
      cancelClose();
      setActive({ issue, top: rect.bottom + 6, left: rect.left });
    },
    [editor, cancelClose]
  );

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onOver = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-harper-id]'
      );
      if (target) openForElement(target);
    };

    const onOut = (event: Event) => {
      const related = (event as MouseEvent).relatedTarget as HTMLElement | null;
      if (related?.closest('[data-harper-id]')) return;
      scheduleClose();
    };

    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    return () => {
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
    };
  }, [editor, openForElement, scheduleClose]);

  if (!editor || !active) return null;

  const { issue, top, left } = active;

  const apply = (index: number) => {
    editor.chain().focus().applyHarperSuggestion(issue.id, index).run();
    setActive(null);
  };

  const ignore = () => {
    editor.chain().focus().ignoreHarperSuggestion(issue.id).run();
    setActive(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Proofing suggestion"
      className={cn('harper-tooltip', className)}
      style={{ position: 'fixed', top, left, zIndex: 60 }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="harper-tooltip-header">
        <span className="harper-tooltip-kind">{issue.kind}</span>
      </div>
      <p className="harper-tooltip-message">{issue.message}</p>
      <div className="harper-tooltip-actions">
        {issue.suggestions.length === 0 ? (
          <span className="harper-tooltip-empty">No suggestions</span>
        ) : (
          issue.suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.kind}-${suggestion.replacement}-${index}`}
              type="button"
              className="harper-tooltip-suggestion"
              onClick={() => apply(index)}
            >
              {suggestion.label || '(empty)'}
            </button>
          ))
        )}
        <button type="button" className="harper-tooltip-ignore" onClick={ignore}>
          Ignore
        </button>
      </div>
    </div>
  );
}
