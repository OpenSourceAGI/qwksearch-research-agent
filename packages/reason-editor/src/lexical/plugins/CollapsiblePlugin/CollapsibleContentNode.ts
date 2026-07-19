/**
 * @fileoverview Lexical node representing the content section of a collapsible group.
 * Extends ElementNode and renders as a <div>.
 */

import { IS_CHROME } from "@lexical/utils";
import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedElementNode,
} from "lexical";

import { $isCollapsibleContainerNode } from "./CollapsibleContainerNode";
import { domOnBeforeMatch, setDomHiddenUntilFound } from "./CollapsibleUtils";

type SerializedCollapsibleContentNode = SerializedElementNode;

export function $convertCollapsibleContentElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const node = $createCollapsibleContentNode();
  return {
    node,
  };
}

/**
 * Node that holds the content of a collapsible section.
 */
export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return "collapsible-content";
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("Collapsible__content");
    if (IS_CHROME) {
      editor.getEditorState().read(() => {
        const containerNode = this.getParentOrThrow();
        if (!$isCollapsibleContainerNode(containerNode)) {
          throw new Error(
            "Expected parent node to be a CollapsibleContainerNode",
          );
        }
        if (!containerNode.__open) {
          setDomHiddenUntilFound(dom);
        }
      });
      domOnBeforeMatch(dom, () => {
        editor.update(() => {
          const containerNode = this.getParentOrThrow().getLatest();
          if (!$isCollapsibleContainerNode(containerNode)) {
            throw new Error(
              "Expected parent node to be a CollapsibleContainerNode",
            );
          }
          if (!containerNode.__open) {
            containerNode.toggleOpen();
          }
        });
      });
    }
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-collapsible-content")) {
          return null;
        }
        return {
          conversion: $convertCollapsibleContentElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.classList.add("Collapsible__content");
    element.setAttribute("data-lexical-collapsible-content", "true");
    return { element };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContentNode,
  ): CollapsibleContentNode {
    return $createCollapsibleContentNode().updateFromJSON(serializedNode);
  }

  isShadowRoot(): boolean {
    return true;
  }
}

/**
 * Creates a new CollapsibleContentNode.
 * @returns {CollapsibleContentNode} The created node.
 */
export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

/**
 * Checks if a Lexical node is a CollapsibleContentNode.
 * @param {LexicalNode | null | undefined} node - The node to check.
 * @returns {boolean} True if the node is a CollapsibleContentNode.
 */
export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}
