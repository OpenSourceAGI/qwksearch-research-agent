/**
 * @module react-reason-editor-sidebar
 * @description The REASON editor's sidebar as a standalone package: the
 * files/folders tree, the "Open Tabs" panel and its all-tabs menu, the
 * outline/AI/related panels, and the split-view menu that toggles which of
 * them are visible. Built on top of `react-reason-editor` (a peer
 * dependency) and designed to be injected into `ReasonDocs`/`RightPanel` via
 * their `SidebarComponent`/`SidebarContentComponent` props.
 */
export { Sidebar } from './Sidebar';
export { SidebarToolbar } from './SidebarToolbar';
export { SidebarFooter } from './SidebarFooter';
export { SidebarContent } from './SidebarContent';
export { SidebarViewMenu } from './SidebarViewMenu';
export * from './fileSourceUtils';

// The full sidebar "API": the contract types this package's components
// implement, plus the panel-toggle config/helpers used to drive them. Owned
// by react-reason-editor and re-exported here so consumers only need this
// one package for both the components and everything needed to type and
// configure them.
export type {
  SidebarProps,
  SidebarContentProps,
  SidebarPanelType,
  OpenTabKind,
  OpenTabItem,
  SidebarAiProps,
  SidebarTipsProps,
  SidebarTopicsProps,
} from 'react-reason-editor/sidebar-kit';
export { PANEL_OPTIONS, togglePanel, applySplitToggle } from 'react-reason-editor/sidebar-kit';
