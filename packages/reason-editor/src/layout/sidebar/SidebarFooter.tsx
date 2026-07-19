/**
 * @module SidebarFooter
 * @description Bottom icon bar of the sidebar. Renders trash, settings,
 * and split-view controls. Only visible in `'tree'` and `'split'`
 * view modes; returns `null` for `'outline'` mode.
 */
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../ui/dropdown-menu';
import { Settings, Trash2, Columns2, RotateCcw, Paintbrush, Database, HardDrive, Wand2, Info, LogIn, LogOut } from 'lucide-react';

const settingsNav = [
  { name: "Appearance", icon: Paintbrush },
  { name: "Storage", icon: Database },
  { name: "File Sources", icon: HardDrive },
  { name: "AI Rewrite Modes", icon: Wand2 },
  { name: "About", icon: Info },
];
import { cn } from '../../lib/utils';
import { Document } from '../../documents/DocumentTree';
import { ThemeDropdown } from '../../theme/theme-dropdown';
import type { ViewMode } from './types';

/** Props for the {@link SidebarFooter} component. */
interface SidebarFooterProps {
  /** Current sidebar view mode. The footer is hidden when mode is `'outline'`. */
  viewMode: ViewMode;
  /** Whether the right-side outline panel is currently visible. */
  showRightOutline: boolean;
  /** Suppresses the settings button when `true` (mobile layout). */
  isMobile?: boolean;
  /** Soft-deleted documents shown in the trash dropdown. */
  deletedDocs: Document[];
  /** Restores a soft-deleted document by ID. */
  onRestore?: (id: string) => void;
  /** Opens the settings dialog, optionally navigating to a specific section. */
  onSettingsClick?: (section?: string) => void;
  /** Logged-in user info, or null/undefined when not authenticated. */
  user?: { name?: string; email?: string } | null;
  /** Called when the user clicks "Login". */
  onLogin?: () => void;
  /** Called when the user clicks "Sign Out". */
  onSignOut?: () => void;
  /** Changes the current view mode. */
  onViewModeChange: (mode: ViewMode) => void;
  /** Toggles the right-side outline panel. */
  onToggleRightOutline?: () => void;
}

/**
 * Compact icon row pinned to the bottom of the sidebar. Includes a trash
 * dropdown (restore deleted docs), settings button, and a split-view mode
 * dropdown. Returns `null` in outline mode.
 */
export const SidebarFooter = ({
  viewMode,
  showRightOutline,
  isMobile,
  deletedDocs,
  onRestore,
  onSettingsClick,
  user,
  onLogin,
  onSignOut,
  onViewModeChange,
  onToggleRightOutline,
}: SidebarFooterProps) => {

  if (viewMode !== 'tree' && viewMode !== 'split') {
    return null;
  }

  return (
    <div className="border-t border-sidebar-border py-1">
      <TooltipProvider delayDuration={300}>
        <nav className="flex items-center justify-around gap-1">
          {/* Theme Dropdown */}



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

          {/* Settings Dropdown */}
          {!isMobile && onSettingsClick && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                {settingsNav.map((item) => (
                  <DropdownMenuItem
                    key={item.name}
                    onClick={() => onSettingsClick(item.name)}
                    className="flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem onClick={onSignOut} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onLogin} className="flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-muted-foreground" />
                    <span>Login</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Split View Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 w-9 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                      (viewMode === 'split' || showRightOutline) && 'bg-sidebar-accent text-sidebar-foreground'
                    )}
                  >
                    <Columns2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Split View Options</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  onViewModeChange(viewMode === 'split' ? 'tree' : 'split');
                  if (showRightOutline && onToggleRightOutline) {
                    onToggleRightOutline();
                  }
                }}
                className="flex items-center justify-between"
              >
                <span>Split View in Sidebar</span>
                {viewMode === 'split' && !showRightOutline && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onToggleRightOutline) {
                    onToggleRightOutline();
                    if (viewMode === 'split') {
                      onViewModeChange('tree');
                    }
                  }
                }}
                className="flex items-center justify-between"
              >
                <span>Outline on Right Side</span>
                {showRightOutline && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (viewMode !== 'tree') {
                    onViewModeChange('tree');
                  }
                  if (showRightOutline && onToggleRightOutline) {
                    onToggleRightOutline();
                  }
                }}
                className="flex items-center justify-between"
              >
                <span>Disable Split View</span>
                {viewMode === 'tree' && !showRightOutline && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </TooltipProvider>
    </div>
  );
};
