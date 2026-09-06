/**
 * @module SidebarViewMenu
 * @description Shared "View Options" dropdown, rendered by both
 * SidebarToolbar and SidebarFooter. Presents two sections — Left Sidebar and
 * Right Sidebar — each with checkboxes for which panels (Open Tabs, Files,
 * Outline, Related, AI) are visible on that side. Selecting two or more
 * panels on a side implicitly stacks them in a split view; there is no
 * separate split toggle.
 */
import { Button } from './app-ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './app-ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './app-ui/dropdown-menu';
import { cn } from './app-utils/utils';
import { PANEL_OPTIONS, togglePanel } from './layout/sidebar/panelOptions';
import type { SidebarPanelType } from './layout/sidebar/types';
import { Columns2 } from 'lucide-react';

/** Props for the {@link SidebarViewMenu} component. */
interface SidebarViewMenuProps {
  leftPanels: SidebarPanelType[];
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  rightPanels: SidebarPanelType[];
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
  /** Whether the floating reading-progress island is currently visible. */
  showDynamicIsland?: boolean;
  /** Toggles the floating reading-progress island. */
  onToggleDynamicIsland?: () => void;
  /** Classes applied to the trigger button (callers use different sizing). */
  triggerClassName?: string;
  /** Tooltip placement for the trigger button. */
  tooltipSide?: 'top' | 'bottom';
  /** Menu content alignment relative to the trigger. */
  align?: 'start' | 'end';
}

export const SidebarViewMenu = ({
  leftPanels,
  onLeftPanelsChange,
  rightPanels,
  onRightPanelsChange,
  showDynamicIsland,
  onToggleDynamicIsland,
  triggerClassName,
  tooltipSide = 'bottom',
  align = 'end',
}: SidebarViewMenuProps) => {
  const isActive = leftPanels.length > 1 || rightPanels.length > 0;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(triggerClassName, isActive && 'bg-sidebar-accent text-sidebar-foreground')}
            >
              <Columns2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>View Options</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Left Sidebar
        </DropdownMenuLabel>
        {PANEL_OPTIONS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem
            key={`left-${type}`}
            checked={leftPanels.includes(type)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onLeftPanelsChange(togglePanel(leftPanels, type, false))}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Right Sidebar
        </DropdownMenuLabel>
        {PANEL_OPTIONS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem
            key={`right-${type}`}
            checked={rightPanels.includes(type)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onRightPanelsChange(togglePanel(rightPanels, type, true))}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </DropdownMenuCheckboxItem>
        ))}

        {onToggleDynamicIsland && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Display
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={!!showDynamicIsland}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggleDynamicIsland()}
            >
              Reading Progress Island
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
