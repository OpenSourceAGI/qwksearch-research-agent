/**
 * @fileoverview Lexical node for representing user mentions or tagging entities.
 */
import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from "lexical";

export type SerializedMentionNode = Spread<
  {
    mentionName: string;
  },
  SerializedTextNode
>;

function $convertMentionElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const mentionName = domNode.getAttribute("data-lexical-mention-name");

  if (textContent !== null) {
    const node = $createMentionNode(
      typeof mentionName === "string" ? mentionName : textContent,
      textContent,
    );
    return {
      node,
    };
  }

  return null;
}

const mentionStyle = "background-color: rgba(24, 119, 232, 0.2)";
/**
 * A Lexical node that represents a mention of a person or entity.
 * Mentions are treated as segmented, immutable tokens by default.
 */
export class MentionNode extends TextNode {
  /** The unique name or ID of the mention */
  __mention: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__mention, node.__text, node.__key);
  }
  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(serializedNode.mentionName).updateFromJSON(
      serializedNode,
    );
  }

  constructor(mentionName: string, text?: string, key?: NodeKey) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cssText = mentionStyle;
    dom.className = "mention";
    dom.spellcheck = false;

    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-mention", "true");
    if (this.__text !== this.__mention) {
      element.setAttribute("data-lexical-mention-name", this.__mention);
    }
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-mention")) {
          return null;
        }
        return {
          conversion: $convertMentionElement,
          priority: 1,
        };
      },
    };
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

/**
 * Creates a `MentionNode`.
 * @param {string} mentionName - The name or ID being mentioned.
 * @param {string} [textContent] - Optional display text (defaults to mentionName).
 * @returns {MentionNode} The created mention node.
 */
export function $createMentionNode(
  mentionName: string,
  textContent?: string,
): MentionNode {
  const mentionNode = new MentionNode(mentionName, (textContent = mentionName));
  mentionNode.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

/**
 * Checks if a node is a `MentionNode`.
 * @param {LexicalNode | null | undefined} node - The node to check.
 * @returns {boolean} True if the node is a `MentionNode`.
 */
export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
