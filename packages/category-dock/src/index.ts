export {
  CategoryDock,
  type CategoryDockProps,
  type CategoryDockMenu,
  type DockNavItem,
} from "./category-dock"

export { ThemeMenu, type ThemeMenuProps } from "./theme-menu"

export {
  CategoryDockProvider,
  useCategoryDock,
  useCategoryDockState,
  useCategoryDockVisibility,
} from "./category-dock-context"

// Primitives re-exported so consumers can build `menu.renderContent` without
// re-importing shadcn components.
export { Dock, DockIcon, DockItem, DockLabel, dockVariants } from "./components/dock"
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
