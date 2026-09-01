/**
 * @module sidebar/index
 * @description Barrel export for the sidebar "contract": the shared types
 * and pure panel-toggle config/helpers reason-editor owns. The sidebar UI
 * itself (Sidebar, SidebarContent, SidebarToolbar, SidebarFooter,
 * SidebarViewMenu) lives in the separate `react-reason-editor-sidebar`
 * package and is injected into ReasonDocs/RightPanel via props typed
 * against these exports (see `sidebar-kit.ts`).
 */
export * from './types';
export * from './panelOptions';
