/**
 * Entry point for the Ai extension that re-exports the extension and its
 * React components. Lets the app import the AI writing assistant from a
 * single, stable module path.
 */

export * from './Ai';
export * from './components/AiMenu';
export { mockAiCompletion } from './lib/mockCompletion';
