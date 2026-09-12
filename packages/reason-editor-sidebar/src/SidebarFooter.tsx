/**
 * @module SidebarFooter
 * @description Bottom icon bar of the sidebar. Renders the storage-source
 * switcher, trash, a settings link, and panel view controls.
 */
import { Button } from './app-ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './app-ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './app-ui/dropdown-menu';
import { Settings, Trash2, RotateCcw, Check } from 'lucide-react';
import type { AnyFileSource } from './app-types/fileSource';
import { getSourceIcon, getSourceTypeLabel } from './fileSourceUtils';
import type { Document } from './documents/DocumentTree';
import type { SidebarPanelType } from './layout/sidebar/types';
import { SidebarViewMenu } from './SidebarViewMenu';

/** Where the settings button navigates when the host app doesn't override it. */
const DEFAULT_SETTINGS_HREF = '/settings';

/** Props for the {@link SidebarFooter} component. */
interface SidebarFooterProps {
  /** Panels currently visible in the left sidebar. */
  leftPanels: SidebarPanelType[];
  /** Changes which panels are visible in the left sidebar. */
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  /** Panels currently visible in the right sidebar. */
  rightPanels: SidebarPanelType[];
  /** Changes which panels are visible in the right sidebar. */
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
  /** Reserved for layout tweaks on the mobile drawer. */
  isMobile?: boolean;
  /** Soft-deleted documents shown in the trash dropdown. */
  deletedDocs: Document[];
  /** Restores a soft-deleted document by ID. */
  onRestore?: (id: string) => void;
  /** URL the settings button opens. Defaults to `/settings`. */
  settingsHref?: string;
  /** Available file source configurations. */
  sources?: AnyFileSource[];
  /** The currently active file source object, or `null` if none selected. */
  activeSource?: AnyFileSource | null;
  /** ID of the currently active file source. */
  activeFileSourceId?: string;
  /** Selects a source by ID and updates the active source state. */
  onSourceSelect?: (sourceId: string) => void;
  /** Called when the user selects a different file source; also gates the switcher. */
  onFileSourceChange?: (sourceId: string) => void;
}

/**
 * Compact icon row pinned to the bottom of the sidebar. Includes the storage
 * source switcher, a trash dropdown (restore deleted docs), a settings link
 * to the settings page, and a panel view dropdown.
 */
export const SidebarFooter = ({
  leftPanels,
  onLeftPanelsChange,
  rightPanels,
  onRightPanelsChange,
  deletedDocs,
  onRestore,
  settingsHref = DEFAULT_SETTINGS_HREF,
  sources = [],
  activeSource,
  activeFileSourceId,
  onSourceSelect,
  onFileSourceChange,
}: SidebarFooterProps) => {
  return (
    <div className="border-t border-sidebar-border py-1">
      <TooltipProvider delayDuration={300}>
        <nav className="flex items-center justify-around gap-1">
          {/* Storage Source Dropdown */}
          {onFileSourceChange && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      {getSourceIcon(activeSource?.type ?? 'local')}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Storage Source: {activeSource?.name || 'Select Source'}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" side="top" className="w-56">
                {sources.map((source, index) => (
                  <div key={source.id}>
                    {index > 0 && sources[index - 1]?.type !== source.type && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      onClick={() => onSourceSelect?.(source.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getSourceIcon(source.type)}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate text-sm">{source.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getSourceTypeLabel(source.type)}
                          </span>
                        </div>
                      </div>
                      {source.id === activeFileSourceId && (
                        <Check className="h-4 w-4 ml-2 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  </div>
                ))}
                {sources.length === 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-xs text-center text-muted-foreground">
                      Add sources in Settings
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Trash Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Trash</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              {deletedDocs.length > 0 ? (
                <>
                  {deletedDocs.slice(0, 5).map((doc) => (
                    <DropdownMenuItem
                      key={doc.id}
                      className="flex items-center justify-between"
                      onClick={() => onRestore?.(doc.id)}
                    >
                      <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                      <RotateCcw className="h-3 w-3 ml-2 opacity-60" />
                    </DropdownMenuItem>
                  ))}
                  {deletedDocs.length > 5 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled className="text-xs text-center">
                        {deletedDocs.length - 5} more in trash...
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              ) : (
                <DropdownMenuItem disabled className="text-center text-muted-foreground">
                  Trash is empty
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings — opens the settings page rather than a menu */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <a href={settingsHref} aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          {/* View Options Menu */}
          <SidebarViewMenu
            leftPanels={leftPanels}
            onLeftPanelsChange={onLeftPanelsChange}
            rightPanels={rightPanels}
            onRightPanelsChange={onRightPanelsChange}
            triggerClassName="h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            tooltipSide="top"
          />
        </nav>
      </TooltipProvider>
    </div>
  );
};
