/**
 * @module sidebar/panelOptions
 * @description Shared metadata and pure helpers for the per-side panel
 * toggle system (AI / Files / Outline / Open Tabs) used by both the left
 * sidebar and the right panel, and by the {@link SidebarViewMenu} dropdown
 * that controls them.
 */
import { Sparkles, FileText, AlignLeft, Layers, Link2, type LucideIcon } from 'lucide-react';
import type { SidebarPanelType } from './types';

/** Ordered list of togglable panel kinds shown in the view menu, with display metadata. */
export const PANEL_OPTIONS: { type: SidebarPanelType; label: string; icon: LucideIcon }[] = [
  { type: 'ai', label: 'AI', icon: Sparkles },
  { type: 'files', label: 'Files', icon: FileText },
  { type: 'outline', label: 'Outline', icon: AlignLeft },
  { type: 'openTabs', label: 'Open Tabs', icon: Layers },
  { type: 'related', label: 'Related', icon: Link2 },
];

/**
 * Computes the next panel list when a single panel checkbox is toggled.
 *
 * In split mode, panels are independently added/removed and may stack.
 * Outside of split mode, selecting a panel replaces the whole list
 * (single active panel), like a radio group rendered as checkboxes.
 *
 * @param panels - Current panels visible on this side.
 * @param split - Whether this side currently allows multiple stacked panels.
 * @param type - The panel being toggled.
 * @param allowEmpty - Whether the resulting list may become empty (hides the side entirely).
 */
export function togglePanel(
  panels: SidebarPanelType[],
  split: boolean,
  type: SidebarPanelType,
  allowEmpty: boolean,
): SidebarPanelType[] {
  const isActive = panels.includes(type);

  if (split) {
    if (isActive) {
      const next = panels.filter((p) => p !== type);
      return next.length === 0 && !allowEmpty ? panels : next;
    }
    return [...panels, type];
  }

  if (isActive) {
    return allowEmpty ? [] : panels;
  }
  return [type];
}

/**
 * Computes the next panel list when split mode is toggled on/off for a side.
 * Turning split off collapses multiple visible panels down to just the first.
 *
 * @param panels - Current panels visible on this side.
 * @param nextSplit - The new split state being applied.
 */
export function applySplitToggle(
  panels: SidebarPanelType[],
  nextSplit: boolean,
): SidebarPanelType[] {
  if (nextSplit || panels.length <= 1) return panels;
  return [panels[0]];
}
