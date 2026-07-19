/**
 * @fileoverview Find and Replace plugin for the Lexical editor.
 * Provides a toolbar UI with inputs and buttons to find and replace text
 * across all text nodes in the editor. Toggled via Ctrl+H / Cmd+H.
 */

import type { JSX, KeyboardEvent } from 'react';
import type { LexicalCommand, LexicalEditor } from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $nodesOfType,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  TextNode,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';

import './FindReplacePlugin.css';

interface FindReplacePayload {
  find: string;
  replace: string;
}

export const FIND_REPLACE_COMMAND: LexicalCommand<FindReplacePayload> =
  createCommand('FIND_REPLACE_COMMAND');

function performFindReplace(
  { find, replace }: FindReplacePayload,
  editor: LexicalEditor,
): boolean {
  if (!find) return false;
  editor.update(() => {
    const textNodes = $nodesOfType(TextNode);
    for (const node of textNodes) {
      const text = node.getTextContent();
      if (text.includes(find)) {
        node.setTextContent(text.replaceAll(find, replace));
      }
    }
  });
  return true;
}

/**
 * Find and Replace plugin.
 *
 * Renders a dismissible bar above the editor content when active.
 * Activated via Ctrl+H (Windows/Linux) or Cmd+H (macOS).
 */
export default function FindReplacePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [replaceCount, setReplaceCount] = useState<number | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Register the command so external code can trigger a replacement too.
  useEffect(() => {
    return editor.registerCommand(
      FIND_REPLACE_COMMAND,
      (payload) => performFindReplace(payload, editor),
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  // Toggle the panel with Ctrl+H / Cmd+H.
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'h' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus the find input when the panel opens.
  useEffect(() => {
    if (isOpen) {
      setReplaceCount(null);
      setTimeout(() => findInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleReplaceAll = useCallback(() => {
    if (!find) return;
    let count = 0;
    editor.update(() => {
      const textNodes = $nodesOfType(TextNode);
      for (const node of textNodes) {
        const text = node.getTextContent();
        if (text.includes(find)) {
          // Count occurrences before replacing
          const matches = text.split(find).length - 1;
          count += matches;
          node.setTextContent(text.replaceAll(find, replace));
        }
      }
    });
    setReplaceCount(count);
  }, [editor, find, replace]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleReplaceAll();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="FindReplace__bar" role="search" aria-label="Find and replace">
      <div className="FindReplace__inputs">
        <input
          ref={findInputRef}
          className="FindReplace__input"
          type="text"
          placeholder="Find"
          value={find}
          onChange={(e) => {
            setFind(e.target.value);
            setReplaceCount(null);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Find text"
        />
        <input
          className="FindReplace__input"
          type="text"
          placeholder="Replace with"
          value={replace}
          onChange={(e) => {
            setReplace(e.target.value);
            setReplaceCount(null);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Replace with text"
        />
      </div>
      <div className="FindReplace__actions">
        <button
          className="FindReplace__button"
          onClick={handleReplaceAll}
          disabled={!find}
          title="Replace all occurrences"
        >
          Replace All
        </button>
        {replaceCount !== null && (
          <span className="FindReplace__status">
            {replaceCount === 0
              ? 'No matches found'
              : `Replaced ${replaceCount} occurrence${replaceCount !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
      <button
        className="FindReplace__close"
        onClick={() => setIsOpen(false)}
        title="Close (Esc)"
        aria-label="Close find and replace"
      >
        ✕
      </button>
    </div>
  );
}
