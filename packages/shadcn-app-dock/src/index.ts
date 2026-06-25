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

// Dropdown menu components for use in menu content
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./components/dropdown-menu"