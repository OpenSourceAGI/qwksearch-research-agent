/**
 * @fileoverview Theme configuration for the comment editor, extending the base playground theme.
 */

import type { EditorThemeClasses } from "lexical";

import "./CommentEditorTheme.css";

import baseTheme from "./PlaygroundEditorTheme";

const theme: EditorThemeClasses = {
  ...baseTheme,
  paragraph: "CommentEditorTheme__paragraph",
};

export default theme;
