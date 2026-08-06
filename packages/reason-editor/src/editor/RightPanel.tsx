/**
 * @module RightPanel
 * @description Inset, resizable right-side panel — part of the normal layout
 * flow (like the left sidebar) rather than floating above it. Renders
 * whichever panels (AI / Files / Outline / Open Tabs) are configured for the
 * right sidebar via the shared {@link SidebarContent} panel renderer, so the
 * right side supports the same panels and stacking as the left sidebar.
 * Drag its left edge to resize.
 */
import { RefObject, useState } from 'react';
import { Resizable } from 're-resizable';
import { SidebarContent } from '../layout/sidebar/SidebarContent';
import { PANEL_OPTIONS } from '../layout/sidebar/panelOptions';
import type { SidebarPanelType, SidebarAiProps, OpenTabItem } from '../layout/sidebar/types';
import type { OutlineViewHandle } from '../search/OutlineView';
import type { TocEntry } from '../app-types/toc';
import type { Document } from '../documents/DocumentTree';
import { Button } from '../app-ui/button';
import { X } from 'lucide-react';

/** Props for the {@link RightPanel} component. */
interface RightPanelProps {
  /** Panels currently visible in the right sidebar. */
  panels: SidebarPanelType[];
  /** Whether the right sidebar allows multiple stacked panels. */
  split: boolean;
  documents: Document[];
  activeId: string | null;
  activeDocument?: Document;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, isFolder?: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'child') => void;
  onManageTags?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  headings: TocEntry[];
  onNavigate: (key: string) => void;
  openTabs?: string[];
  activeTab?: string | null;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabRename?: (id: string, newTitle: string) => void;
  onSplitRight?: (id: string) => void;
  onReopenLastClosed?: () => void;
  canReopenLastClosed?: boolean;
  outlineRef?: RefObject<OutlineViewHandle | null>;
  aiProps: SidebarAiProps;
  /** Closes the panel by clearing the right sidebar's panel list. */
  onClose: () => void;
  /** Unified tab list (files + chats). Overrides file-only tab derivation when set. */
  tabItems?: OpenTabItem[];
  /** Opens a new chat tab from the "Open Tabs" panel header. */
  onNewChat?: () => void;
}

const RESIZE_HANDLES = {
  top: false,
  right: false,
  bottom: false,
  left: true,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false,
};

const PANEL_LABELS: Record<SidebarPanelType, string> = Object.fromEntries(
  PANEL_OPTIONS.map(({ type, label }) => [type, label]),
) as Record<SidebarPanelType, string>;

/**
 * Inset panel docked at the right edge of the layout, full height, resizable
 * by dragging its left edge; its body renders whichever panels are enabled
 * for the right sidebar.
 */
export function RightPanel({
  panels,
  split,
  documents,
  activeId,
  activeDocument,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
  onManageTags,
  onRename,
  headings,
  onNavigate,
  openTabs,
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed,
  outlineRef,
  aiProps,
  onClose,
  tabItems,
  onNewChat,
}: RightPanelProps) {
  const [width, setWidth] = useState(320);

  const title = panels.length === 1 ? PANEL_LABELS[panels[0]] : 'Right Panel';

  return (
    <Resizable
      size={{ width, height: '100%' }}
      onResizeStop={(_e, _dir, ref) => setWidth(ref.offsetWidth)}
      minWidth={260}
      maxWidth={640}
      enable={RESIZE_HANDLES}
      className="h-full flex flex-col border-l border-sidebar-border/60 bg-sidebar-background shrink-0"
    >
      <div className="h-full overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-sidebar-border/60 flex items-center justify-between select-none shrink-0">
          <h3 className="text-sm font-semibold text-sidebar-foreground">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <SidebarContent
            panels={panels}
            split={split}
            persistenceKey="right"
            activeDocuments={documents}
            activeId={activeId}
            activeDocument={activeDocument}
            headings={headings}
            onSelect={onSelect}
            onAdd={onAdd}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onManageTags={onManageTags}
            onRename={onRename}
            outlineRef={outlineRef}
            openTabs={openTabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
            onTabRename={onTabRename}
            onSplitRight={onSplitRight}
            onReopenLastClosed={onReopenLastClosed}
            canReopenLastClosed={canReopenLastClosed}
            onNavigate={onNavigate}
            aiProps={aiProps}
            tabItems={tabItems}
            onNewChat={onNewChat}
          />
        </div>
      </div>
    </Resizable>
  );
}
