/**
 * @module sidebar/panelOptions
 * @description Shared metadata and pure helpers for the per-side panel
 * toggle system (Open Tabs / Files / Outline / Related / AI) used by both
 * the left sidebar and the right panel, and by the {@link SidebarViewMenu}
 * dropdown that controls them.
 */
import { Sparkles, FileText, AlignLeft, Layers, Link2, type LucideIcon } from 'lucide-react';
import type { SidebarPanelType } from './types';

/**
 * Ordered list of togglable panel kinds shown in the view menu, with display
 * metadata. This order is also the canonical stacking order for the panels
 * within a sidebar (Open Tabs always stacks above the Files tree).
 */
export const PANEL_OPTIONS: { type: SidebarPanelType; label: string; icon: LucideIcon }[] = [
  { type: 'openTabs', label: 'Open Tabs', icon: Layers },
  { type: 'files', label: 'Files', icon: FileText },
  { type: 'outline', label: 'Outline', icon: AlignLeft },
  { type: 'related', label: 'Related', icon: Link2 },
  { type: 'ai', label: 'AI', icon: Sparkles },
];

/**
 * Sorts a panel list into the canonical stacking order defined by
 * {@link PANEL_OPTIONS} (e.g. Open Tabs above Files), regardless of the
 * order the panels were toggled on in.
 */
export function sortPanels(panels: SidebarPanelType[]): SidebarPanelType[] {
  const order = PANEL_OPTIONS.map((option) => option.type);
  return [...panels].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Computes the next panel list when a single panel checkbox is toggled.
 *
 * Panels are independently added/removed and may stack; whether a side is
 * "split" is inferred from the result (2 or more panels selected) rather
 * than being a separate mode.
 *
 * @param panels - Current panels visible on this side.
 * @param type - The panel being toggled.
 * @param allowEmpty - Whether the resulting list may become empty (hides the side entirely).
 */
export function togglePanel(
  panels: SidebarPanelType[],
  type: SidebarPanelType,
  allowEmpty: boolean,
): SidebarPanelType[] {
  const isActive = panels.includes(type);

  if (isActive) {
    const next = panels.filter((p) => p !== type);
    return next.length === 0 && !allowEmpty ? panels : next;
  }
  return sortPanels([...panels, type]);
}
