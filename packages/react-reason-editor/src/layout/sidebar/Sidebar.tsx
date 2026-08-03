/**
 * @module Sidebar
 * @description Mobile-aware sidebar shell. Renders the toolbar and content
 * inside a Sheet on mobile and directly in the layout on desktop.
 */
import { useState, useRef, useEffect } from 'react';
import { DocumentTreeHandle } from '../../file-tree/filetree';
import { OutlineViewHandle } from '../../search/OutlineView';
import { Sheet, SheetContent } from '../../app-ui/sheet';
import { getFileSources } from '../../app-utils/file-sources/sources';
import { AnyFileSource } from '../../app-types/fileSource';
import { FileManagerModal } from '../../dialogs/FileManagerModal';
import { SidebarToolbar } from './SidebarToolbar';
import { SidebarContent } from './SidebarContent';
import type { SidebarProps } from './types';

export const Sidebar = ({
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
  onSearchFocus,
  isOpen,
  onOpenChange,
  isMobile,
  leftPanels,
  onLeftPanelsChange,
  leftSplit,
  onLeftSplitChange,
  rightPanels,
  onRightPanelsChange,
  rightSplit,
  onRightSplitChange,
  onSettingsClick,
  onRestore,
  newDocumentId,
  showDynamicIsland,
  onToggleDynamicIsland,
  activeFileSourceId = 'local-default',
  onFileSourceChange,
  headings = [],
  onNavigate,
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
  aiProps,
}: SidebarProps) => {
  const deletedDocs = documents.filter(doc => doc.isDeleted);

  const activeDocuments = documents.filter(doc => !doc.isDeleted);

  // Track expand/collapse all state for file tree
  const [allExpanded, setAllExpanded] = useState(false);
  // Track expand/collapse all state for outline
  const [outlineExpanded, setOutlineExpanded] = useState(true);
  // Ref for file tree
  const treeRef = useRef<DocumentTreeHandle>(null);
  // Ref for outline view
  const outlineRef = useRef<OutlineViewHandle>(null);

  // File sources - memoize to prevent infinite loops
  const [sources] = useState<AnyFileSource[]>(() => getFileSources());
  const [activeSource, setActiveSource] = useState<AnyFileSource | null>(() => {
    const loadedSources = getFileSources();
    return loadedSources.find((s) => s.id === activeFileSourceId) || loadedSources[0] || null;
  });

  // File manager modal state
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);

  // Update active source when activeFileSourceId changes
  useEffect(() => {
    const active = sources.find((s) => s.id === activeFileSourceId);
    if (active && active.id !== activeSource?.id) {
      setActiveSource(active);
    }
  }, [activeFileSourceId, activeSource?.id, sources]);

  const handleSourceSelect = (sourceId: string) => {
    const selected = sources.find((s) => s.id === sourceId);
    if (selected) {
      setActiveSource(selected);
      onFileSourceChange?.(sourceId);
    }
  };

  const handleToggleAllExpanded = () => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    if (treeRef.current) {
      if (newState) {
        treeRef.current.expandAll();
      } else {
        treeRef.current.cancelExpand?.();
        treeRef.current.collapseAll();
      }
    }
  };

  const handleToggleOutlineExpanded = () => {
    const newState = !outlineExpanded;
    setOutlineExpanded(newState);
    if (outlineRef.current) {
      if (newState) {
        outlineRef.current.expandAll();
      } else {
        outlineRef.current.collapseAll();
      }
    }
  };

  // Trigger edit mode for newly created documents
  useEffect(() => {
    if (newDocumentId && treeRef.current) {
      const timer = setTimeout(() => {
        const treeElement = treeRef.current as any;
        if (treeElement && typeof treeElement.edit === 'function') {
          treeElement.edit(newDocumentId);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [newDocumentId]);

  const toolbarProps = {
    leftPanels,
    leftSplit,
    onLeftPanelsChange,
    onLeftSplitChange,
    rightPanels,
    rightSplit,
    onRightPanelsChange,
    onRightSplitChange,
    activeId,
    onAdd,
    onSearchFocus,
    onFileManagerOpen: () => setIsFileManagerOpen(true),
    sources,
    activeSource,
    activeFileSourceId,
    onFileSourceChange,
    onSourceSelect: handleSourceSelect,
    allExpanded,
    outlineExpanded,
    onToggleAllExpanded: handleToggleAllExpanded,
    onToggleOutlineExpanded: handleToggleOutlineExpanded,
    treeRef,
    outlineRef,
    deletedDocs,
    onRestore,
    onSettingsClick,
    showDynamicIsland,
    onToggleDynamicIsland,
    isMobile,
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    documents,
  };

  const contentProps = {
    panels: leftPanels,
    split: leftSplit,
    persistenceKey: 'left',
    activeDocuments,
    activeId,
    activeDocument,
    headings,
    isMobile,
    onSelect,
    onAdd,
    onDelete,
    onDuplicate,
    onMove,
    onManageTags,
    onRename,
    onOpenChange,
    treeRef,
    outlineRef,
    openTabs,
    activeTab,
    onTabChange,
    onTabClose,
    onTabRename,
    onSplitRight,
    onReopenLastClosed,
    canReopenLastClosed,
    onNavigate,
    aiProps,
  };

  // Mobile: render in a drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
          <aside className="h-full flex flex-col bg-sidebar-background">
            <SidebarToolbar {...toolbarProps} />
            <div className="flex-1 min-h-0 overflow-hidden">
              <SidebarContent {...contentProps} />
            </div>
            <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as sidebar, full height
  return (
    <aside className="h-screen w-full flex flex-col bg-sidebar-background pt-[100px]">
      <SidebarToolbar {...toolbarProps} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarContent {...contentProps} />
      </div>
      <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
    </aside>
  );
};
