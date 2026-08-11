/**
 * Floating "Ask AI anything…" panel for the Ai extension. Reads the
 * extension's ProseMirror plugin state (menu / loading / reviewing / error)
 * and renders the matching UI: the quick-command list, a streaming spinner,
 * the accept/discard/insert-below/try-again review controls, or an error
 * with a retry action. Positioned with `@floating-ui/dom` and rendered
 * through a portal so it floats above the editor regardless of scroll
 * containers, the same approach `SlashCommand` uses for its own popup.
 *
 * Styled with hand-written `.ai-menu*` classes (see `src/styles/ProseMirror.scss`)
 * rather than Tailwind utilities: this component ships inside the published
 * extension bundle, and following the `Harper` tooltip's plain-CSS precedent
 * keeps it independent of whichever Tailwind config a host app compiles with.
 */

import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { posToDOMRect, useEditorState } from '@tiptap/react';
import { Check, CornerDownRight, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useEditorInstance } from '@/store/editor';
import { useEditableEditor } from '@/store/store';

import { getAiOptions, getAiState } from '../Ai';

import type { AiCommandDefinition, AiPanelState } from '../types';

const CLOSED_PANEL: AiPanelState = { status: 'closed' };

function MenuRow({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="ai-menu-row">
      <Icon className="ai-menu-row-icon" />
      {label}
    </button>
  );
}

export function AiMenu() {
  const editor = useEditorInstance();
  const editable = useEditableEditor();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const panel = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? (getAiState(e.state)?.panel ?? CLOSED_PANEL) : CLOSED_PANEL),
  });

  const range = useMemo(() => {
    if (panel.status === 'closed') return null;
    if (panel.status === 'reviewing') return { from: panel.suggestion.from, to: panel.suggestion.to };
    return { from: panel.from, to: panel.to };
  }, [panel]);

  const isOpen = panel.status !== 'closed';

  // Reset and focus the input each time the menu opens fresh.
  useEffect(() => {
    if (panel.status === 'menu') {
      setPrompt('');
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [panel.status]);

  // Keep the panel anchored to its range as the document/viewport changes.
  useEffect(() => {
    if (!editor || !range || !containerRef.current) {
      setPosition(null);
      return;
    }

    const virtualElement = {
      getBoundingClientRect: () => posToDOMRect(editor.view, range.from, range.to),
    };

    const update = () => {
      if (!containerRef.current) return;
      computePosition(virtualElement, containerRef.current, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => setPosition({ x, y }));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // Re-run as the streamed suggestion grows so the panel follows it.
  }, [editor, range?.from, range?.to, panel]);

  // Escape / click-outside closes the panel without touching the document.
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        editor.commands.closeAiMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') editor.commands.closeAiMenu();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, editor]);

  if (!editable || !editor || !isOpen || !position) return null;

  const commands: AiCommandDefinition[] = getAiOptions(editor)?.commands ?? [];

  const submitPrompt = () => {
    if (!prompt.trim()) return;
    editor.commands.submitAiPrompt(prompt);
  };

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Ask AI"
      className="ai-menu"
      style={{ position: 'fixed', top: position.y, left: position.x, zIndex: 60 }}
    >
      <div className="ai-menu-input-row">
        <Sparkles className="ai-menu-input-icon" />
        <input
          ref={inputRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submitPrompt();
            }
          }}
          placeholder="Ask AI anything…"
          className="ai-menu-input"
        />
      </div>

      {panel.status === 'menu' && (
        <div className="ai-menu-commands">
          {commands.map((command) => (
            <button
              key={command.id}
              type="button"
              onClick={() => editor.commands.runAiCommand(command.id)}
              className="ai-menu-command"
            >
              <command.icon className="ai-menu-row-icon" />
              <span className="ai-menu-command-text">
                <span className="ai-menu-command-label">{command.label}</span>
                {command.description && (
                  <span className="ai-menu-command-description">{command.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {panel.status === 'loading' && (
        <div className="ai-menu-loading">
          <Loader2 className="ai-menu-row-icon ai-menu-spin" />
          {panel.commandLabel === 'Custom' ? 'Generating…' : `${panel.commandLabel}…`}
        </div>
      )}

      {panel.status === 'error' && (
        <div className="ai-menu-error">
          <p className="ai-menu-error-message">{panel.message}</p>
          <MenuRow icon={RotateCcw} label="Try again" onClick={() => editor.commands.retryAiSuggestion()} />
        </div>
      )}

      {panel.status === 'reviewing' && (
        <div className="ai-menu-review">
          <MenuRow
            icon={Check}
            label="Accept"
            disabled={panel.suggestion.isStreaming}
            onClick={() => editor.commands.acceptAiSuggestion()}
          />
          <MenuRow icon={X} label="Discard" onClick={() => editor.commands.discardAiSuggestion()} />
          <MenuRow
            icon={CornerDownRight}
            label="Insert below"
            disabled={panel.suggestion.isStreaming}
            onClick={() => editor.commands.insertAiSuggestionBelow()}
          />
          <MenuRow icon={RotateCcw} label="Try again" onClick={() => editor.commands.retryAiSuggestion()} />
        </div>
      )}
    </div>,
    document.body
  );
}
