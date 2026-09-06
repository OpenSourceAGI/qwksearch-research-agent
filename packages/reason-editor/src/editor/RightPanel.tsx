/**
 * @module RightPanel
 * @description Inset, resizable right-side panel — part of the normal layout
 * flow (like the left sidebar) rather than floating above it. Renders
 * whichever panels (AI / Files / Outline / Open Tabs) are configured for the
 * right sidebar via the shared {@link SidebarContent} panel renderer, so the
 * right side supports the same panels and stacking as the left sidebar.
 * Drag its left edge to resize.
 */
import { RefObject, useState, type ComponentType } from 'react';
import { Resizable } from 're-resizable';
import {
  PANEL_OPTIONS,
  type SidebarPanelType,
  type SidebarAiProps,
  type SidebarTipsProps,
  type SidebarTopicsProps,
  type OpenTabItem,
  type SidebarContentProps,
  type OutlineViewHandle,
  type ActiveHeadingEditorHandle,
  type TocEntry,
  type Document,
} from 'react-reason-editor-sidebar';
import { Button } from '../app-ui/button';
import { Sheet, SheetContent } from '../app-ui/sheet';
import { cn } from '../app-utils/utils';
import { X } from 'lucide-react';

/** Translucent, blurred glass background — matches the app dock and weather widget. */
const SIDEBAR_GLASS_CLASSES =
  'bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/15 dark:border-white/10';

/** Props for the {@link RightPanel} component. */
interface RightPanelProps {
  /** Renders the panel body. Supply `SidebarContent` from `react-reason-editor-sidebar`. */
  SidebarContentComponent: ComponentType<SidebarContentProps>;
  /** Panels currently visible in the right sidebar. Two or more panels render stacked in a split. */
  panels: SidebarPanelType[];
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
  editorRef?: RefObject<ActiveHeadingEditorHandle | null>;
  tabItems?: OpenTabItem[];
  onNewChat?: () => void;
  aiProps: SidebarAiProps;
  /** AI-generated page tips state/handlers (used by the "ai" panel). */
  tipsProps?: SidebarTipsProps;
  /** AI-generated search topics state/handlers (used by the "related" panel). */
  topicsProps?: SidebarTopicsProps;
  /** Closes the panel by clearing the right sidebar's panel list. */
  onClose: () => void;
  /** Renders as a slide-in drawer instead of an inset resizable panel. */
  isMobile?: boolean;
  /** Whether the mobile drawer is open. Ignored when `isMobile` is false. */
  isOpen?: boolean;
  /** Called when the mobile drawer's open state should change. */
  onOpenChange?: (open: boolean) => void;
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
  SidebarContentComponent,
  panels,
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
  editorRef,
  tabItems,
  onNewChat,
  aiProps,
  tipsProps,
  topicsProps,
  onClose,
  isMobile,
  isOpen,
  onOpenChange,
}: RightPanelProps) {
  const [width, setWidth] = useState(320);

  const title = panels.length === 1 ? PANEL_LABELS[panels[0]] : 'Right Panel';

  const body = (
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
        <SidebarContentComponent
          panels={panels}
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
          editorRef={editorRef}
          openTabs={openTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onTabRename={onTabRename}
          onSplitRight={onSplitRight}
          onReopenLastClosed={onReopenLastClosed}
          canReopenLastClosed={canReopenLastClosed}
          onNavigate={onNavigate}
          tabItems={tabItems}
          onNewChat={onNewChat}
          aiProps={aiProps}
          tipsProps={tipsProps}
          topicsProps={topicsProps}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn('w-80 p-0', SIDEBAR_GLASS_CLASSES)}>
          <aside className="h-full flex flex-col">{body}</aside>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Resizable
      size={{ width, height: '100%' }}
      onResizeStop={(_e, _dir, ref) => setWidth(ref.offsetWidth)}
      minWidth={260}
      maxWidth={640}
      enable={RESIZE_HANDLES}
      className={cn('h-full flex flex-col border-l shrink-0', SIDEBAR_GLASS_CLASSES)}
    >
      {body}
    </Resizable>
  );
}
