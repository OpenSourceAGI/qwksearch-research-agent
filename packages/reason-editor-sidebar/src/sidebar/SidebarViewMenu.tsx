/**
 * @module SidebarViewMenu
 * @description Shared "Split View Options" dropdown, rendered by both
 * SidebarToolbar and SidebarFooter. Presents two sections — Left Sidebar and
 * Right Sidebar — each with a Split View toggle and checkboxes for which
 * panels (AI, Files, Outline, Open Tabs) are visible on that side.
 */
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Columns2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { PANEL_OPTIONS, togglePanel, applySplitToggle } from './panelOptions';
import type { SidebarPanelType } from './types';

/** Props for the {@link SidebarViewMenu} component. */
interface SidebarViewMenuProps {
  leftPanels: SidebarPanelType[];
  onLeftPanelsChange: (panels: SidebarPanelType[]) => void;
  leftSplit: boolean;
  onLeftSplitChange: (split: boolean) => void;
  rightPanels: SidebarPanelType[];
  onRightPanelsChange: (panels: SidebarPanelType[]) => void;
  rightSplit: boolean;
  onRightSplitChange: (split: boolean) => void;
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
  leftSplit,
  onLeftSplitChange,
  rightPanels,
  onRightPanelsChange,
  rightSplit,
  onRightSplitChange,
  showDynamicIsland,
  onToggleDynamicIsland,
  triggerClassName,
  tooltipSide = 'bottom',
  align = 'end',
}: SidebarViewMenuProps) => {
  const isActive = leftSplit || rightSplit || rightPanels.length > 0;

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
          <p>Split View Options</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Left Sidebar
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={leftSplit}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={(checked) => {
            onLeftSplitChange(checked);
            onLeftPanelsChange(applySplitToggle(leftPanels, checked));
          }}
        >
          Split View
        </DropdownMenuCheckboxItem>
        {PANEL_OPTIONS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem
            key={`left-${type}`}
            checked={leftPanels.includes(type)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onLeftPanelsChange(togglePanel(leftPanels, leftSplit, type, false))}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Right Sidebar
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={rightSplit}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={(checked) => {
            onRightSplitChange(checked);
            onRightPanelsChange(applySplitToggle(rightPanels, checked));
          }}
        >
          Split View
        </DropdownMenuCheckboxItem>
        {PANEL_OPTIONS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuCheckboxItem
            key={`right-${type}`}
            checked={rightPanels.includes(type)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onRightPanelsChange(togglePanel(rightPanels, rightSplit, type, true))}
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
