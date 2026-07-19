/**
 * @fileoverview Lexical node for displaying and managing images in the editor.
 * Includes support for captions (using a nested Lexical editor), resizing, and alt text.
 */


import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  RangeSelection,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type { JSX } from 'react';

import { $insertGeneratedNodes } from '@lexical/clipboard';
import { HashtagNode } from '@lexical/hashtag';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import {
  $applyNodeReplacement,
  $createRangeSelection,
  $extendCaretToRange,
  $getChildCaret,
  $getEditor,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $selectAll,
  $setSelection,
  createEditor,
  DecoratorNode,
  LineBreakNode,
  ParagraphNode,
  RootNode,
  SKIP_DOM_SELECTION_TAG,
  TextNode,
} from 'lexical';
import * as React from 'react';

import { EmojiNode } from './EmojiNode';
import { KeywordNode } from './KeywordNode';

const ImageComponent = React.lazy(() => import('./ImageComponent'));

/**
 * Payload for creating an `ImageNode`.
 */
export interface ImagePayload {
  /** Alternative text for the image */
  altText: string;
  /** Nested Lexical editor for the image caption */
  caption?: LexicalEditor;
  /** Height of the image in pixels */
  height?: number;
  /** Lexical node key */
  key?: NodeKey;
  /** Maximum width for the image */
  maxWidth?: number;
  /** Whether to show the caption editor */
  showCaption?: boolean;
  /** Source URL of the image */
  src: string;
  /** Width of the image in pixels */
  width?: number;
  /** Whether captions are enabled globally */
  captionsEnabled?: boolean;
}

function isGoogleDocCheckboxImg(img: HTMLImageElement): boolean {
  return (
    img.parentElement != null &&
    img.parentElement.tagName === 'LI' &&
    img.previousSibling === null &&
    img.getAttribute('aria-roledescription') === 'checkbox'
  );
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute('src');
  if (!src || src.startsWith('file:///') || isGoogleDocCheckboxImg(img)) {
    return null;
  }
  const { alt: altText, width, height } = img;
  const node = $createImageNode({ altText, height, src, width });
  return { node };
}

export function $isCaptionEditorEmpty(): boolean {
  // Search the document for any non-element node
  // to determine if it's empty or not
  for (const { origin } of $extendCaretToRange(
    $getChildCaret($getRoot(), 'next'),
  )) {
    if (!$isElementNode(origin)) {
      return false;
    }
  }
  return true;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: SerializedEditor;
    height?: number;
    maxWidth: number;
    showCaption: boolean;
    src: string;
    width?: number;
  },
  SerializedLexicalNode
>;

/**
 * A Lexical decorator node that represents an image.
 */
export class ImageNode extends DecoratorNode<JSX.Element> {
  /** Source URL of the image */
  __src: string;
  /** Alternative text for accessibility */
  __altText: string;
  /** Current width of the image */
  __width: 'inherit' | number;
  /** Current height of the image */
  __height: 'inherit' | number;
  /** Maximum allowed width */
  __maxWidth: number;
  /** Whether the caption is currently visible */
  __showCaption: boolean;
  /** Nested Lexical editor instance for the caption */
  __caption: LexicalEditor;
  /** Whether caption editing is enabled for this node */
  __captionsEnabled: boolean;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, src, showCaption } = serializedNode;
    return $createImageNode({
      altText,
      height,
      maxWidth,
      showCaption,
      src,
      width,
    }).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedImageNode>): this {
    const node = super.updateFromJSON(serializedNode);
    const { caption } = serializedNode;

    const nestedEditor = node.__caption;
    const editorState = nestedEditor.parseEditorState(caption.editorState);
    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState);
    }
    return node;
  }

  exportDOM(): DOMExportOutput {
    const imgElement = document.createElement('img');
    imgElement.setAttribute('src', this.__src);
    imgElement.setAttribute('alt', this.__altText);
    imgElement.setAttribute('width', this.__width.toString());
    imgElement.setAttribute('height', this.__height.toString());

    if (this.__showCaption && this.__caption) {
      const captionEditor = this.__caption;
      const captionHtml = captionEditor.read(() => {
        if ($isCaptionEditorEmpty()) {
          return null;
        }
        // Don't serialize the wrapping paragraph if there is only one
        let selection: null | RangeSelection = null;
        const firstChild = $getRoot().getFirstChild();
        if (
          $isParagraphNode(firstChild) &&
          firstChild.getNextSibling() === null
        ) {
          selection = $createRangeSelection();
          selection.anchor.set(firstChild.getKey(), 0, 'element');
          selection.focus.set(
            firstChild.getKey(),
            firstChild.getChildrenSize(),
            'element',
          );
        }
        return $generateHtmlFromNodes(captionEditor, selection);
      });
      if (captionHtml) {
        const figureElement = document.createElement('figure');
        const figcaptionElement = document.createElement('figcaption');
        figcaptionElement.innerHTML = captionHtml;

        figureElement.appendChild(imgElement);
        figureElement.appendChild(figcaptionElement);

        return { element: figureElement };
      }
    }

    return { element: imgElement };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figcaption: () => ({
        conversion: () => ({ node: null }),
        priority: 0,
      }),
      figure: () => ({
        conversion: (node) => {
          return {
            after: (childNodes) => {
              const imageNodes = childNodes.filter($isImageNode);
              const figcaption = node.querySelector('figcaption');
              if (figcaption) {
                for (const imgNode of imageNodes) {
                  imgNode.setShowCaption(true);
                  imgNode.__caption.update(
                    () => {
                      const editor = $getEditor();
                      $insertGeneratedNodes(
                        editor,
                        $generateNodesFromDOM(editor, figcaption),
                        $selectAll(),
                      );
                      $setSelection(null);
                    },
                    { tag: SKIP_DOM_SELECTION_TAG },
                  );
                }
              }
              return imageNodes;
            },
            node: null,
          };
        },
        priority: 0,
      }),
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__showCaption = showCaption || false;
    this.__caption =
      caption ||
      createEditor({
        namespace: 'Playground/ImageNodeCaption',
        nodes: [
          RootNode,
          TextNode,
          LineBreakNode,
          ParagraphNode,
          LinkNode,
          EmojiNode,
          HashtagNode,
          KeywordNode,
        ],
      });
    this.__captionsEnabled = captionsEnabled || captionsEnabled === undefined;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        showCaption={this.__showCaption}
        caption={this.__caption}
        captionsEnabled={this.__captionsEnabled}
        resizable={true}
      />
    );
  }
}

/**
 * Creates an `ImageNode`.
 * @param {ImagePayload} payload - The image configuration.
 * @returns {ImageNode} The created image node.
 */
export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src,
      altText,
      maxWidth,
      width,
      height,
      showCaption,
      caption,
      captionsEnabled,
      key,
    ),
  );
}

/**
 * Checks if a node is an `ImageNode`.
 * @param {LexicalNode | null | undefined} node - The node to check.
 * @returns {boolean} True if the node is an `ImageNode`.
 */
export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
