import { useState, useRef, useEffect } from 'react';
import { DocumentTreeHandle } from '../../filetree/filetree';
import { OutlineViewHandle } from '../../search/OutlineView';
import { Sheet, SheetContent } from '../../ui/sheet';
import { getFileSources } from '../../lib/file-sources/sources';
import { AnyFileSource } from '../../types/fileSource';
import { FileManagerModal } from '../../modals/FileManagerModal';
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
  onToggleExpand,
  onMove,
  onManageTags,
  onRename,
  searchQuery,
  onSearchFocus,
  isOpen,
  onOpenChange,
  isMobile,
  viewMode,
  onViewModeChange,
  onSettingsClick,
  onRestore,
  newDocumentId,
  showRightOutline = false,
  onToggleRightOutline,
  activeFileSourceId = 'local-default',
  onFileSourceChange,
  headings = [],
  openTabs = [],
  activeTab,
  onTabChange,
  onTabClose,
  onTabRename,
  onSplitRight,
  onReopenLastClosed,
  canReopenLastClosed = false,
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

  // Mobile: render in a drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
          <aside className="h-full flex flex-col bg-sidebar-background">
            <div className='min-h-[100px]'> </div>
            <SidebarToolbar
              viewMode={viewMode}
              activeId={activeId}
              onAdd={onAdd}
              onSearchFocus={onSearchFocus}
              onFileManagerOpen={() => setIsFileManagerOpen(true)}
              sources={sources}
              activeSource={activeSource}
              activeFileSourceId={activeFileSourceId}
              onFileSourceChange={onFileSourceChange}
              onSourceSelect={handleSourceSelect}
              allExpanded={allExpanded}
              outlineExpanded={outlineExpanded}
              onToggleAllExpanded={handleToggleAllExpanded}
              onToggleOutlineExpanded={handleToggleOutlineExpanded}
              treeRef={treeRef}
              outlineRef={outlineRef}
              deletedDocs={deletedDocs}
              onRestore={onRestore}
              showRightOutline={showRightOutline}
              onToggleRightOutline={onToggleRightOutline}
              onViewModeChange={onViewModeChange}
              onSettingsClick={onSettingsClick}
              isMobile={isMobile}
              openTabs={openTabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onTabClose={onTabClose}
              documents={documents}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <SidebarContent
                viewMode={viewMode}
                activeDocuments={activeDocuments}
                activeId={activeId}
                activeDocument={activeDocument}
                searchQuery={searchQuery}
                isMobile={isMobile}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onToggleExpand={onToggleExpand}
                onMove={onMove}
                onManageTags={onManageTags}
                onRename={onRename}
                onOpenChange={onOpenChange}
                treeRef={treeRef}
                outlineRef={outlineRef}
                headings={headings}
                openTabs={openTabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
                onTabClose={onTabClose}
                onTabRename={onTabRename}
                onSplitRight={onSplitRight}
                onReopenLastClosed={onReopenLastClosed}
                canReopenLastClosed={canReopenLastClosed}
              />
            </div>
            <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as sidebar with 100px top margin, full height
  return (
    <aside style={{ paddingTop: '60px' }} className="h-screen w-full flex flex-col bg-sidebar-background">
      <SidebarToolbar
        viewMode={viewMode}
        activeId={activeId}
        onAdd={onAdd}
        onSearchFocus={onSearchFocus}
        onFileManagerOpen={() => setIsFileManagerOpen(true)}
        sources={sources}
        activeSource={activeSource}
        activeFileSourceId={activeFileSourceId}
        onFileSourceChange={onFileSourceChange}
        onSourceSelect={handleSourceSelect}
        allExpanded={allExpanded}
        outlineExpanded={outlineExpanded}
        onToggleAllExpanded={handleToggleAllExpanded}
        onToggleOutlineExpanded={handleToggleOutlineExpanded}
        treeRef={treeRef}
        outlineRef={outlineRef}
        deletedDocs={deletedDocs}
        onRestore={onRestore}
        showRightOutline={showRightOutline}
        onToggleRightOutline={onToggleRightOutline}
        onViewModeChange={onViewModeChange}
        onSettingsClick={onSettingsClick}
        isMobile={isMobile}
        openTabs={openTabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
        documents={documents}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SidebarContent
          viewMode={viewMode}
          activeDocuments={activeDocuments}
          activeId={activeId}
          activeDocument={activeDocument}
          searchQuery={searchQuery}
          isMobile={isMobile}
          onSelect={onSelect}
          onAdd={onAdd}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleExpand={onToggleExpand}
          onMove={onMove}
          onManageTags={onManageTags}
          onRename={onRename}
          onOpenChange={onOpenChange}
          treeRef={treeRef}
          outlineRef={outlineRef}
          headings={headings}
          openTabs={openTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onTabRename={onTabRename}
          onSplitRight={onSplitRight}
          onReopenLastClosed={onReopenLastClosed}
          canReopenLastClosed={canReopenLastClosed}
        />
      </div>
      <FileManagerModal open={isFileManagerOpen} onOpenChange={setIsFileManagerOpen} documents={activeDocuments} onSelectDocument={onSelect} />
    </aside>
  );
};
