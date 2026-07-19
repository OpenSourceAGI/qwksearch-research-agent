/**
 * @fileoverview Plugin for inserting and managing YouTube video nodes in the editor.
 * Registers the INSERT_YOUTUBE_COMMAND and handles node insertion.
 */

import type { JSX } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from "lexical";
import { useEffect } from "react";

import { $createYouTubeNode, YouTubeNode } from "../../nodes/YouTubeNode";

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand(
  "INSERT_YOUTUBE_COMMAND",
);

/**
 * Plugin that enables YouTube video embedding in the editor.
 * @returns {null} This plugin doesn't render any UI directly.
 * @throws {Error} If YouTubeNode is not registered on the editor.
 */
export default function YouTubePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error("YouTubePlugin: YouTubeNode not registered on editor");
    }

    return editor.registerCommand<string>(
      INSERT_YOUTUBE_COMMAND,
      (payload) => {
        const youTubeNode = $createYouTubeNode(payload);
        $insertNodeToNearestRoot(youTubeNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
