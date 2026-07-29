/**
 * @fileoverview Public API barrel for the shadcn-app-dock package.
 *
 * Re-exports the `CategoryDock` component and its types, the `ThemeMenu` theme switcher,
 * the dock context provider/hooks, and select dropdown-menu/dock primitives that consumers
 * need to build custom `menu.renderContent` implementations.
 */
"use client"

export {
  CategoryDock,
  type CategoryDockProps,
  type CategoryDockMenu,
  type DockNavItem,
} from "./shadcn-app-dock"

export { ThemeMenu, type ThemeMenuProps } from "./theme-menu"

export {
  CategoryDockProvider,
  useCategoryDock,
  useCategoryDockState,
  useCategoryDockVisibility,
} from "./shadcn-app-dock-context"

// Primitives re-exported so consumers can build `menu.renderContent` without
// re-importing shadcn components.
export { Dock, DockIcon, DockItem, DockLabel, dockVariants } from "./components/dock"
export {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./components/dropdown-menu"
