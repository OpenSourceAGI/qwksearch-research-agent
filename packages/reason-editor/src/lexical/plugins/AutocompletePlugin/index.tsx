/**
 * @fileoverview Plugin for providing autocomplete suggestions as the user types.
 * Suggestions are displayed as transient Lexical nodes that can be accepted with Tab or Swipe.
 */

import type { NodeKey, TextNode } from 'lexical';
import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $addUpdateTag,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

import { useSettings } from '../../context/SettingsContext';
import { useToolbarState } from '../../context/ToolbarContext';
import {
  $createAutocompleteNode,
  AutocompleteNode,
} from '../../nodes/AutocompleteNode';
import { addSwipeRightListener } from '../../utils/swipe';
import { formatSuggestionText, prepareFinalText } from './formatting';
// import { preloadModel } from './predictNextWords';
import { $search } from './search';
import { HISTORY_MERGE, uuid } from './types';
import type { AutocompleteType, SearchPromise } from './types';
import { useQuery } from './useQuery';

// Re-export uuid so it can be imported by AutocompleteNode
export { uuid } from './types';

/**
 * Plugin that provides asynchronous autocomplete suggestions.
 * It monitors the user's cursor position and triggers a query when a potential match is found.
 * @returns {JSX.Element | null} This plugin does not render anything directly.
 */
export default function AutocompletePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const query = useQuery();
  const { toolbarState } = useToolbarState();
  const { settings } = useSettings();

  // Preload model when plugin mounts (plugin only mounts when autocomplete is enabled)
  // useEffect(() => {
  //   preloadModel().catch((error) => {
  //     console.error('[AutocompletePlugin] Failed to preload model:', error);
  //   });
  // }, []);

  useEffect(() => {
    let autocompleteNodeKey: null | NodeKey = null;
    let lastMatch: null | string = null;
    let lastMatchType: AutocompleteType | null = null;
    let lastSuggestion: null | string = null;
    let searchPromise: null | SearchPromise = null;
    let prevNodeFormat: number = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function $clearSuggestion() {
      const autocompleteNode =
        autocompleteNodeKey !== null
          ? $getNodeByKey(autocompleteNodeKey)
          : null;
      if (autocompleteNode !== null && autocompleteNode.isAttached()) {
        autocompleteNode.remove();
        autocompleteNodeKey = null;
      }
      if (searchPromise !== null) {
        searchPromise.dismiss();
        searchPromise = null;
      }
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      lastMatch = null;
      lastMatchType = null;
      lastSuggestion = null;
      prevNodeFormat = 0;
    }
    function updateAsyncSuggestion(
      refSearchPromise: SearchPromise,
      newSuggestion: null | string,
    ) {
      if (searchPromise !== refSearchPromise || newSuggestion === null) {
        return;
      }

      editor.update(() => {
        const selection = $getSelection();
        const [hasMatch, match, matchType] = $search(selection, settings.isAutocompleteWords, settings.isAutocompleteSentences);

        if (!hasMatch || match !== lastMatch || matchType !== lastMatchType || !$isRangeSelection(selection)) {
          return;
        }
        const selectionCopy = selection.clone();
        const prevNode = selection.getNodes()[0] as TextNode;
        prevNodeFormat = prevNode.getFormat();

        const formattedText = formatSuggestionText(newSuggestion, matchType);

        const node = $createAutocompleteNode(
          formattedText,
          uuid,
        )
          .setFormat(prevNodeFormat)
          .setStyle(`font-size: ${toolbarState.fontSize}`);

        autocompleteNodeKey = node.getKey();

        selection.insertNodes([node]);
        $setSelection(selectionCopy);
        lastSuggestion = newSuggestion;
      }, HISTORY_MERGE);
    }

    function $handleAutocompleteNodeTransform(node: AutocompleteNode) {
      const key = node.getKey();
      if (node.__uuid === uuid && key !== autocompleteNodeKey) {
        // Max one Autocomplete node per session
        $clearSuggestion();
      }
    }
    function handleUpdate() {
      editor.update(() => {
        const selection = $getSelection();
        const [hasMatch, match, matchType] = $search(selection, settings.isAutocompleteWords, settings.isAutocompleteSentences);

        if (!hasMatch) {
          $clearSuggestion();
          lastMatch = null;
          lastMatchType = null;
          return;
        }

        // Check if the match has actually changed
        if (match === lastMatch && matchType === lastMatchType) {
          return;
        }

        // Clear any pending debounce timer
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        // Clear previous suggestion immediately
        const autocompleteNode =
          autocompleteNodeKey !== null
            ? $getNodeByKey(autocompleteNodeKey)
            : null;
        if (autocompleteNode !== null && autocompleteNode.isAttached()) {
          autocompleteNode.remove();
          autocompleteNodeKey = null;
        }

        // Cancel previous search if it exists
        if (searchPromise !== null) {
          searchPromise.dismiss();
          searchPromise = null;
        }

        // No debounce for word completion, 2s debounce for phrase completion
        const debounceDelay = matchType === 'word' ? 0 : 2000;

        debounceTimer = setTimeout(() => {
          searchPromise = query(match, matchType!);
          searchPromise.promise
            .then((newSuggestion) => {
              if (searchPromise !== null) {
                updateAsyncSuggestion(searchPromise, newSuggestion);
              }
            })
            .catch((e) => {
              if (e !== 'Dismissed') {
                console.error('[AutocompletePlugin] Error:', e);
              }
            });
        }, debounceDelay);

        lastMatch = match;
        lastMatchType = matchType;
      }, HISTORY_MERGE);
    }
    function $handleAutocompleteIntent(): boolean {
      if (lastSuggestion === null || autocompleteNodeKey === null) {
        return false;
      }
      const autocompleteNode = $getNodeByKey(autocompleteNodeKey);
      if (autocompleteNode === null) {
        return false;
      }

      const finalText = prepareFinalText(lastSuggestion, lastMatchType);

      const textNode = $createTextNode(finalText)
        .setFormat(prevNodeFormat)
        .setStyle(`font-size: ${toolbarState.fontSize}`);
      autocompleteNode.replace(textNode);
      textNode.selectNext();
      $clearSuggestion();
      return true;
    }
    function $handleKeypressCommand(e: Event) {
      if ($handleAutocompleteIntent()) {
        e.preventDefault();
        return true;
      }
      return false;
    }
    function handleSwipeRight(_force: number, e: TouchEvent) {
      editor.update(() => {
        if ($handleAutocompleteIntent()) {
          e.preventDefault();
        } else {
          $addUpdateTag(HISTORY_MERGE.tag);
        }
      });
    }
    function unmountSuggestion() {
      editor.update(() => {
        $clearSuggestion();
      }, HISTORY_MERGE);
    }

    const rootElem = editor.getRootElement();

    const unregister = mergeRegister(
      editor.registerNodeTransform(
        AutocompleteNode,
        $handleAutocompleteNodeTransform,
      ),
      editor.registerUpdateListener(handleUpdate),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        $handleKeypressCommand,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $handleKeypressCommand,
        COMMAND_PRIORITY_LOW,
      ),
      ...(rootElem !== null
        ? [addSwipeRightListener(rootElem, handleSwipeRight)]
        : []),
      unmountSuggestion,
    );

    return unregister;
  }, [editor, query, toolbarState.fontSize, settings.isAutocompleteWords, settings.isAutocompleteSentences]);

  return null;
}
