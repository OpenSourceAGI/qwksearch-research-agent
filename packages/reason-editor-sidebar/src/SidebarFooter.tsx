/**
 * @module SidebarFooter
 * @description Bottom icon bar of the sidebar. Renders trash, settings,
 * and panel view controls.
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
import { Settings, Trash2, RotateCcw, Paintbrush, Database, HardDrive, Wand2, Info, LogIn, LogOut } from 'lucide-react';

const settingsNav = [
  { name: "Appearance", icon: Paintbrush },
  { name: "Storage", icon: Database },
  { name: "File Sources", icon: HardDrive },
  { name: "AI Rewrite Modes", icon: Wand2 },
  { name: "About", icon: Info },
];
import type { Document } from './documents/DocumentTree';
import type { SidebarPanelType } from './layout/sidebar/types';
import { SidebarViewMenu } from './SidebarViewMenu';

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
}

/**
 * Compact icon row pinned to the bottom of the sidebar. Includes a trash
 * dropdown (restore deleted docs), settings button, and a panel view
 * dropdown.
 */
export const SidebarFooter = ({
  leftPanels,
  onLeftPanelsChange,
  rightPanels,
  onRightPanelsChange,
  isMobile,
  deletedDocs,
  onRestore,
  onSettingsClick,
  user,
  onLogin,
  onSignOut,
}: SidebarFooterProps) => {
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
