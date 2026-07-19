/**
 * @fileoverview Theme configuration for sticky notes, extending the base playground theme.
 */

import type { EditorThemeClasses } from "lexical";

import "./StickyEditorTheme.css";

import baseTheme from "./PlaygroundEditorTheme";

const theme: EditorThemeClasses = {
  ...baseTheme,
  paragraph: "StickyEditorTheme__paragraph",
};

export default theme;
