/**
 * @fileoverview Custom Lexical node for text highlighting.
 * Similar to TipTap's Mark extension, this creates a semantic <mark> element
 * with customizable background colors and unique IDs.
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import { addClassNamesToElement } from '@lexical/utils';
import { $applyNodeReplacement, TextNode } from 'lexical';

export type SerializedHighlightNode = Spread<
  {
    color: string;
    id: string;
  },
  SerializedTextNode
>;

/**
 * HighlightNode represents highlighted text with a background color.
 * Renders as a <mark> element with optional color and ID attributes.
 */
export class HighlightNode extends TextNode {
  __color: string;
  __id: string;

  static getType(): string {
    return 'highlight';
  }

  static clone(node: HighlightNode): HighlightNode {
    return new HighlightNode(node.__text, node.__color, node.__id, node.__key);
  }

  constructor(text: string, color?: string, id?: string, key?: NodeKey) {
    super(text, key);
    this.__color = color || '#FFFF00';
    this.__id = id || this.generateId();
  }

  private generateId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('mark');
    element.style.backgroundColor = this.__color;
    element.style.color = 'inherit';
    element.setAttribute('data-color', this.__color);
    element.setAttribute('data-id', this.__id);
    addClassNamesToElement(element, config.theme.highlight);
    return element;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__color !== this.__color) {
      dom.style.backgroundColor = this.__color;
      dom.setAttribute('data-color', this.__color);
    }
    if (prevNode.__id !== this.__id) {
      dom.setAttribute('data-id', this.__id);
    }
    return isUpdated;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      mark: () => ({
        conversion: convertHighlightElement,
        priority: 0,
      }),
      span: (node: HTMLElement) => {
        // Support span with background-color as highlight
        const hasBackgroundColor = node.style.backgroundColor;
        if (!hasBackgroundColor) {
          return null;
        }
        return {
          conversion: convertHighlightElement,
          priority: 0,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedHighlightNode): HighlightNode {
    const node = $createHighlightNode(
      serializedNode.text,
      serializedNode.color,
      serializedNode.id,
    );
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedHighlightNode {
    return {
      ...super.exportJSON(),
      color: this.__color,
      id: this.__id,
      type: 'highlight',
      version: 1,
    };
  }

  getColor(): string {
    const self = this.getLatest();
    return self.__color;
  }

  setColor(color: string): void {
    const self = this.getWritable();
    self.__color = color;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  setId(id: string): void {
    const self = this.getWritable();
    self.__id = id;
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

function convertHighlightElement(element: HTMLElement): DOMConversionOutput {
  const node = $createHighlightNode(
    element.textContent || '',
    element.getAttribute('data-color') || element.style.backgroundColor || '#FFFF00',
    element.getAttribute('data-id') || undefined,
  );
  return { node };
}

/**
 * Creates a HighlightNode with the given text, color, and optional ID.
 * @param text - Text content for the HighlightNode
 * @param color - Background color (CSS color value)
 * @param id - Optional unique identifier
 * @returns A new HighlightNode instance
 */
export function $createHighlightNode(
  text: string = '',
  color: string = '#FFFF00',
  id?: string,
): HighlightNode {
  return $applyNodeReplacement(new HighlightNode(text, color, id));
}

/**
 * Checks if a node is a HighlightNode.
 * @param node - Node to check
 * @returns True if the node is a HighlightNode
 */
export function $isHighlightNode(
  node: LexicalNode | null | undefined,
): node is HighlightNode {
  return node instanceof HighlightNode;
}
