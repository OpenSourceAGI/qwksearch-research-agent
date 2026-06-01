/**
 * @fileoverview Plugin that renders Mermaid diagrams inside code blocks.
 * When a code block has language="mermaid", it renders the diagram using Mermaid.js
 */

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isCodeNode, CodeNode } from '@lexical/code';
import { $getNodeByKey, LexicalEditor } from 'lexical';
import './index.css';

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

/**
 * Lazy load mermaid library
 */
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      const mermaid = module.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * Renders a Mermaid diagram from a code node
 */
async function renderMermaidDiagram(
  editor: LexicalEditor,
  nodeKey: string,
): Promise<void> {
  try {
    const mermaid = await loadMermaid();

    editor.getEditorState().read(async () => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCodeNode(node)) return;

      const code = node.getTextContent();
      if (!code.trim()) return;

      const dom = editor.getElementByKey(nodeKey);
      if (!dom) return;

      const codeEl = dom.querySelector('code') as HTMLElement;
      if (!codeEl) return;

      // Generate unique ID for this diagram
      const id = `mermaid-${nodeKey}`;

      try {
        // Clear previous content
        codeEl.innerHTML = '';

        // Render the diagram
        const { svg } = await mermaid.render(id, code);

        // Create a wrapper for the SVG
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-diagram-wrapper';
        wrapper.innerHTML = svg;

        // Apply styles
        wrapper.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 4px;
          overflow: auto;
        `;

        codeEl.appendChild(wrapper);
        codeEl.classList.add('mermaid-rendered');
      } catch (error) {
        console.error('Mermaid render error:', error);
        // Show error message
        codeEl.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          color: #ef4444;
          padding: 0.5rem;
          font-family: monospace;
          font-size: 0.875rem;
        `;
        errorDiv.textContent = `Mermaid Error: ${error instanceof Error ? error.message : 'Failed to render diagram'}`;
        codeEl.appendChild(errorDiv);
      }
    });
  } catch (error) {
    console.error('Failed to load Mermaid:', error);
  }
}

/**
 * Plugin that monitors code nodes and renders Mermaid diagrams
 */
export default function MermaidPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const processedNodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Process all code nodes on mount and when editor updates
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
          editorState.read(() => {
            const rootNode = editorState._nodeMap;
            const currentKeys = new Set<string>();

            rootNode.forEach((node, key) => {
              if ($isCodeNode(node) && node.getLanguage() === 'mermaid') {
                currentKeys.add(key);

                // Only render if not already processed or content changed
                if (!processedNodesRef.current.has(key)) {
                  processedNodesRef.current.add(key);
                  renderMermaidDiagram(editor, key);
                }
              }
            });

            // Clean up processed nodes that no longer exist
            processedNodesRef.current.forEach((key) => {
              if (!currentKeys.has(key)) {
                processedNodesRef.current.delete(key);
              }
            });
          });
        }, 300); // Debounce rendering
      },
    );

    // Also listen to node transforms for immediate updates
    const unregisterTransform = editor.registerNodeTransform(CodeNode, (node) => {
      if (node.getLanguage() === 'mermaid') {
        const key = node.getKey();
        setTimeout(() => {
          renderMermaidDiagram(editor, key);
        }, 100);
      }
    });

    return () => {
      clearTimeout(timeoutRef.current);
      unregisterListener();
      unregisterTransform();
    };
  }, [editor]);

  return null;
}
