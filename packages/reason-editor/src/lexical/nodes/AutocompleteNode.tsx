/**
 * @fileoverview Lexical node for displaying autocomplete suggestions.
 * This node is transient and specifically handled to not interfere with collaboration.
 */


import type {
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import { TextNode } from 'lexical';

import { uuid as UUID } from '../plugins/AutocompletePlugin';

export type SerializedAutocompleteNode = Spread<
  {
    uuid: string;
  },
  SerializedTextNode
>;

/**
 * A Lexical node that represents an autocomplete suggestion in the editor.
 */
export class AutocompleteNode extends TextNode {
  /**
   * A unique uuid is generated for each session and assigned to the instance.
   * This helps to:
   * - Ensures max one Autocomplete node per session.
   * - Ensure that when collaboration is enabled, this node is not shown in
   *   other sessions.
   * See https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/AutocompletePlugin/index.tsx
   */
  __uuid: string;

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__text, node.__uuid, node.__key);
  }

  static getType(): 'autocomplete' {
    return 'autocomplete';
  }

  static importDOM() {
    // Never import from DOM
    return null;
  }

  static importJSON(
    serializedNode: SerializedAutocompleteNode,
  ): AutocompleteNode {
    return $createAutocompleteNode(
      serializedNode.text,
      serializedNode.uuid,
    ).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      ...super.exportJSON(),
      uuid: this.__uuid,
    };
  }

  constructor(text: string, uuid: string, key?: NodeKey) {
    super(text, key);
    this.__uuid = uuid;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  exportDOM(_: LexicalEditor): DOMExportOutput {
    return { element: null };
  }

  excludeFromCopy() {
    return true;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add(config.theme.autocomplete);
    if (this.__uuid !== UUID) {
      dom.style.display = 'none';
    }
    return dom;
  }
}

/**
 * Creates an `AutocompleteNode`.
 * @param {string} text - The text content of the suggestion.
 * @param {string} uuid - The unique session ID.
 * @returns {AutocompleteNode} The created node.
 */
export function $createAutocompleteNode(
  text: string,
  uuid: string,
): AutocompleteNode {
  return new AutocompleteNode(text, uuid).setMode('token');
}
