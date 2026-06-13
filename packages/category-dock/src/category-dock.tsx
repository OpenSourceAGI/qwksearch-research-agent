"use client"

import { useEffect, type ReactNode } from "react"

import { cn } from "./lib/utils"
import { Dock, DockIcon, DockItem, DockLabel } from "./components/dock"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./components/dropdown-menu"

export interface DockNavItem {
  /** Stable identity for the item (also used for React keys). */
  key: string
  label: string
  /** A string is treated as an image src (rendered via `renderImage`); a node is rendered as-is. */
  icon: ReactNode | string
  active?: boolean
  onClick?: () => void
}

export interface CategoryDockMenu {
  /** Trigger icon — string src (via `renderImage`) or a node. */
  triggerIcon: ReactNode | string
  triggerLabel?: string
  contentClassName?: string
  /** Full control over the dropdown body. Compose `<ThemeMenu />` here for the theme switcher. */
  renderContent: (ctx: { side: "top" | "bottom"; close: () => void }) => ReactNode
}

export interface CategoryDockProps {
  items: DockNavItem[]
  /** Optional trailing dropdown menu (e.g. settings + theme switcher). */
  menu?: CategoryDockMenu
  /** Renders string icons. Defaults to a plain `<img>`; pass next/image for Next apps. */
  renderImage?: (src: string, alt: string, size: number) => ReactNode
  /** Alt+1..n triggers the matching item's `onClick`. Default false. */
  enableKeyboardShortcuts?: boolean
  className?: string
  /** Which fixed placements to render. Defaults to both. */
  placements?: { desktop?: boolean; mobile?: boolean }
}

const ICON_SIZE = 24

const defaultRenderImage = (src: string, alt: string, size: number): ReactNode => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} width={size} height={size} className="w-full h-full" />
)

function renderIcon(
  icon: ReactNode | string,
  alt: string,
  renderImage: (src: string, alt: string, size: number) => ReactNode,
): ReactNode {
  return typeof icon === "string" ? renderImage(icon, alt, ICON_SIZE) : icon
}

function MenuDockItem({
  menu,
  side,
  renderImage,
}: {
  menu: CategoryDockMenu
  side: "bottom" | "top"
  renderImage: (src: string, alt: string, size: number) => ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DockItem className="flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer bg-gray-200 dark:bg-neutral-800">
          {menu.triggerLabel && <DockLabel>{menu.triggerLabel}</DockLabel>}
          <DockIcon>{renderIcon(menu.triggerIcon, menu.triggerLabel ?? "menu", renderImage)}</DockIcon>
        </DockItem>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align="end"
        className={cn("w-56 max-h-[min(400px,70vh)] overflow-y-auto", menu.contentClassName)}
        collisionPadding={8}
      >
        <MenuBody menu={menu} side={side} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Split out so `renderContent` can run inside the portal and receive a stable close handler.
function MenuBody({ menu, side }: { menu: CategoryDockMenu; side: "bottom" | "top" }) {
  // Radix manages open state; closing is handled by item selection. `close` is a no-op
  // placeholder kept for API symmetry / future controlled use.
  return <>{menu.renderContent({ side, close: () => {} })}</>
}

function DockInstance({
  dockClassName,
  side,
  items,
  menu,
  renderImage,
}: {
  dockClassName: string
  side: "bottom" | "top"
  items: DockNavItem[]
  menu?: CategoryDockMenu
  renderImage: (src: string, alt: string, size: number) => ReactNode
}) {
  return (
    <Dock direction="middle" className={dockClassName}>
      {items.map((item) => (
        <DockItem
          key={item.key}
          onClick={item.onClick}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer",
            item.active
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-gray-200 dark:bg-neutral-800",
          )}
        >
          <DockLabel>{item.label}</DockLabel>
          <DockIcon>{renderIcon(item.icon, item.label, renderImage)}</DockIcon>
        </DockItem>
      ))}
      {menu && <MenuDockItem menu={menu} side={side} renderImage={renderImage} />}
    </Dock>
  )
}

export function CategoryDock({
  items,
  menu,
  renderImage = defaultRenderImage,
  enableKeyboardShortcuts = false,
  className,
  placements,
}: CategoryDockProps) {
  const showDesktop = placements?.desktop ?? true
  const showMobile = placements?.mobile ?? true

  useEffect(() => {
    if (!enableKeyboardShortcuts) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const numKey = parseInt(event.key, 10)
        if (numKey >= 1 && numKey <= items.length) {
          event.preventDefault()
          items[numKey - 1].onClick?.()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableKeyboardShortcuts, items])

  return (
    <>
      {showDesktop && (
        <div className={cn("hidden md:block fixed top-0 left-2 z-50", className)}>
          <DockInstance
            dockClassName="h-[52px] shrink-0 !mt-0 !mx-0"
            side="bottom"
            items={items}
            menu={menu}
            renderImage={renderImage}
          />
        </div>
      )}

      {showMobile && (
        <div className={cn("md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe", className)}>
          <DockInstance
            dockClassName="h-[52px] shrink-0 !mt-0 mx-auto w-max mb-2 !gap-1 !p-1"
            side="top"
            items={items}
            menu={menu}
            renderImage={renderImage}
          />
        </div>
      )}
    </>
  )
}
