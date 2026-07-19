/**
 * @module DocumentTabs
 * @description Tab bar listing all open documents. Tabs shrink to fit available
 * space; a "…" overflow dropdown provides access to all tabs and close actions.
 */
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { X, Plus, Menu, Edit2, RotateCcw, SplitSquareVertical } from 'lucide-react';
import { Document } from './DocumentTree';
import { cn } from '../lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

/** Props for the {@link DocumentTabs} component. */
interface DocumentTabsProps {
  openTabs: string[];
  activeTab: string | null;
  documents: Document[];
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onRename?: (tabId: string, newTitle: string) => void;
  onMenuClick?: () => void;
  onDelete?: (tabId: string) => void;
  onReopenLastClosed?: () => void;
  onSplitRight?: (tabId: string) => void;
  canReopenLastClosed?: boolean;
}

export const DocumentTabs = ({
  openTabs,
  activeTab,
  documents,
  onTabChange,
  onTabClose,
  onTabAdd,
  onRename,
  onMenuClick,
  onDelete,
  onReopenLastClosed,
  onSplitRight,
  canReopenLastClosed = false,
}: DocumentTabsProps) => {
  const isMobile = useIsMobile();
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = tabsListRef.current;
    if (el) setHasOverflow(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useEffect(() => {
    const el = tabsListRef.current;
    if (!el) return;
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkOverflow, openTabs]);

  const getDocumentTitle = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    return doc?.title || 'Untitled';
  };

  useEffect(() => {
    if (renamingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingTabId]);

  const handleDoubleClick = (tabId: string) => {
    if (onRename) {
      setRenamingTabId(tabId);
      setRenameValue(getDocumentTitle(tabId));
    }
  };

  const handleRenameSubmit = () => {
    if (renamingTabId && renameValue.trim() && onRename) {
      onRename(renamingTabId, renameValue.trim());
    }
    setRenamingTabId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenamingTabId(null);
      setRenameValue('');
    }
  };

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b border-border bg-card">
      <Tabs value={activeTab || undefined} onValueChange={onTabChange}>
        <div className="flex items-center min-w-0">
          {isMobile && onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-none border-r border-border shrink-0"
              onClick={onMenuClick}
              title="Menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Tabs list — overflow hidden so tabs shrink rather than scroll */}
          <div ref={tabsListRef} className="flex-1 min-w-0 overflow-hidden">
            <TabsList className="h-10 bg-transparent p-0 rounded-none border-0 w-full flex flex-nowrap">
              {openTabs.map((tabId) => (
                <ContextMenu key={tabId}>
                  <ContextMenuTrigger className="flex-1 min-w-[80px]">
                    <div className="relative group h-10 w-full">
                      <TabsTrigger
                        value={tabId}
                        onDoubleClick={() => handleDoubleClick(tabId)}
                        className={cn(
                          'w-full h-10 rounded-none border-r border-border px-2 py-2',
                          'data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:font-bold',
                          'data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600',
                          'data-[state=active]:z-10',
                          'data-[state=inactive]:bg-muted/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:font-normal',
                          'hover:bg-muted pr-7 transition-all duration-200'
                        )}
                      >
                        {renamingTabId === tabId ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={handleRenameSubmit}
                            className="w-full text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 font-normal"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-sm block w-full">
                            {getDocumentTitle(tabId)}
                          </span>
                        )}
                      </TabsTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0',
                          'opacity-0 group-hover:opacity-100 transition-opacity',
                          'hover:bg-destructive/10 hover:text-destructive'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(tabId);
                        }}
                        title="Close tab"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {onRename && (
                      <ContextMenuItem onClick={() => handleDoubleClick(tabId)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </ContextMenuItem>
                    )}
                    {onDelete && (
                      <ContextMenuItem
                        onClick={() => onDelete(tabId)}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    {onSplitRight && (
                      <ContextMenuItem onClick={() => onSplitRight(tabId)}>
                        <SplitSquareVertical className="mr-2 h-4 w-4" />
                        Split Right
                      </ContextMenuItem>
                    )}
                    {onReopenLastClosed && (
                      <ContextMenuItem
                        onClick={onReopenLastClosed}
                        disabled={!canReopenLastClosed}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reopen Last Closed Tab
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </TabsList>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-none border-r border-border shrink-0"
            onClick={onTabAdd}
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Tabs>
    </div>
  );
};
