/**
 * @fileoverview Lexical node for displaying emojis as images or spans.
 */


import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, TextNode } from 'lexical';

export type SerializedEmojiNode = Spread<
  {
    className: string;
  },
  SerializedTextNode
>;

/**
 * A Lexical node that represents an emoji in the editor.
 */
export class EmojiNode extends TextNode {
  /** The CSS class name used for styling the emoji node */
  __className: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__className, node.__text, node.__key);
  }

  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    const inner = super.createDOM(config);
    dom.className = this.__className;
    inner.className = 'emoji-inner';
    dom.appendChild(inner);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const inner = dom.firstChild;
    if (inner === null) {
      return true;
    }
    super.updateDOM(prevNode, inner as HTMLElement, config);
    return false;
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(
      serializedNode.className,
      serializedNode.text,
    ).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      className: this.getClassName(),
    };
  }

  getClassName(): string {
    const self = this.getLatest();
    return self.__className;
  }
}

/**
 * Checks if a node is an `EmojiNode`.
 * @param {LexicalNode | null | undefined} node - The node to check.
 * @returns {boolean} True if the node is an `EmojiNode`.
 */
export function $isEmojiNode(
  node: LexicalNode | null | undefined,
): node is EmojiNode {
  return node instanceof EmojiNode;
}

/**
 * Creates an `EmojiNode`.
 * @param {string} className - The CSS class name for the emoji.
 * @param {string} emojiText - The text representation of the emoji.
 * @returns {EmojiNode} The created node.
 */
export function $createEmojiNode(
  className: string,
  emojiText: string,
): EmojiNode {
  const node = new EmojiNode(className, emojiText).setMode('token');
  return $applyNodeReplacement(node);
}
