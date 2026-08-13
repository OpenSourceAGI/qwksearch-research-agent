/**
 * Entry point for the Harper extension that re-exports the extension and its React components. Lets the app import the Harper grammar and spell checker from a single, stable module path.
 */

export * from './Harper';
export * from './components/RichTextHarper';
export { createHarperLinter, getSharedHarperLinter } from './lib/createHarperLinter';
export type { CreateHarperLinterOptions, HarperDialect } from './lib/createHarperLinter';
export { extractTextWithMap, spanToRange } from './lib/extractTextWithMap';
export type { TextWithMap } from './lib/extractTextWithMap';
