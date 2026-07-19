/**
 * @fileoverview Lexical node for highlighting specific keywords in the editor.
 */
import type { EditorConfig, LexicalNode, SerializedTextNode } from "lexical";

import { $applyNodeReplacement, TextNode } from "lexical";

export type SerializedKeywordNode = SerializedTextNode;

/**
 * A Lexical node that represents a highlighted keyword.
 * Keywords are treated as immutable tokens.
 */
export class KeywordNode extends TextNode {
  static getType(): string {
    return "keyword";
  }

  static clone(node: KeywordNode): KeywordNode {
    return new KeywordNode(node.__text, node.__key);
  }

  static importJSON(serializedNode: SerializedKeywordNode): KeywordNode {
    return $createKeywordNode().updateFromJSON(serializedNode);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cursor = "default";
    dom.className = "keyword";
    return dom;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

/**
 * Creates a `KeywordNode`.
 * @param {string} [keyword=""] - The text of the keyword.
 * @returns {KeywordNode} The created node.
 */
export function $createKeywordNode(keyword: string = ""): KeywordNode {
  return $applyNodeReplacement(new KeywordNode(keyword));
}

/**
 * Checks if a node is a `KeywordNode`.
 * @param {LexicalNode | null | undefined} node - The node to check.
 * @returns {boolean} True if the node is a `KeywordNode`.
 */
export function $isKeywordNode(node: LexicalNode | null | undefined): boolean {
  return node instanceof KeywordNode;
}
