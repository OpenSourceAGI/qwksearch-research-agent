/**
 * @fileoverview Plugin that enables support for sticky notes (StickyNode) in the editor.
 * Ensures the StickyNode is registered on the editor instance.
 */

import type { JSX } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { StickyNode } from "../../nodes/StickyNode";

/**
 * Plugin that checks for StickyNode registration.
 * @returns {null} This plugin doesn't render any UI directly.
 * @throws {Error} If StickyNode is not registered on the editor.
 */
export default function StickyPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([StickyNode])) {
      throw new Error("StickyPlugin: StickyNode not registered on editor");
    }
  }, [editor]);
  return null;
}
