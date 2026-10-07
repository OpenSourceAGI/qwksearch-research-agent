/**
 * @fileoverview `research-agent-ui/workspace` — the QwkSearch app *with* the
 * REASON editor and its file sidebar.
 *
 * Everything the chat-only root entry exports is re-exported here, so a host
 * that wants documents imports from this one path rather than mixing the two.
 * The trade-off is the dependency tree: this entry pulls in
 * `react-reason-editor` and `react-reason-editor-sidebar` (both optional peer
 * dependencies), which the root entry never touches.
 */
'use client';

// The editor-bearing surfaces.
export {
  QwkSearchWorkspaceApp,
  type QwkSearchWorkspaceAppProps,
} from './workspace/QwkSearchWorkspaceApp';
export {
  ResearchWorkspaceView,
  type ResearchWorkspaceViewProps,
} from './workspace/ResearchWorkspaceView';
export { getPageTips, htmlToPlainText } from './workspace/page-tips';
export { getTopicSearches } from './workspace/topic-searches';

// Everything the chat-only entry offers, so hosts need only one import path.
export * from './index';
