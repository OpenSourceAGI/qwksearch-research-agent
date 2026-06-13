"use client"

import { useEffect, type ReactNode } from "react"

import { cn } from "./lib/utils"
import { Dock, DockIcon, DockItem, DockLabel } from "./components/dock"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./components/dropdown-menu"

export interface CategoryDockMenu {
  /** Trigger icon — string src (via `renderImage`) or a node. Falls back to the item's own icon when used inline. */
  triggerIcon?: ReactNode | string
  triggerLabel?: string
  contentClassName?: string
  /** Full control over the dropdown body. Compose `<ThemeMenu />` here for the theme switcher. */
  renderContent: (ctx: { side: "top" | "bottom"; close: () => void }) => ReactNode
}

export interface DockNavItem {
  /** Stable identity for the item (also used for React keys). */
  key: string
  label: string
  /** A string is treated as an image src (rendered via `renderImage`); a node is rendered as-is. */
  icon: ReactNode | string
  active?: boolean
  onClick?: () => void
  /** Optional inline dropdown menu. When set, the item renders as a dropdown trigger instead of a nav button. */
  menu?: CategoryDockMenu
}

export interface CategoryDockProps {
  items: DockNavItem[]
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
  itemIcon,
  itemLabel,
}: {
  menu: CategoryDockMenu
  side: "bottom" | "top"
  renderImage: (src: string, alt: string, size: number) => ReactNode
  itemIcon?: ReactNode | string
  itemLabel?: string
}) {
  const triggerIcon = menu.triggerIcon ?? itemIcon
  const triggerLabel = menu.triggerLabel ?? itemLabel
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DockItem className="flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer bg-gray-200 dark:bg-neutral-800">
          {triggerLabel && <DockLabel>{triggerLabel}</DockLabel>}
          <DockIcon>{triggerIcon ? renderIcon(triggerIcon, triggerLabel ?? "menu", renderImage) : null}</DockIcon>
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
  renderImage,
}: {
  dockClassName: string
  side: "bottom" | "top"
  items: DockNavItem[]
  renderImage: (src: string, alt: string, size: number) => ReactNode
}) {
  return (
    <Dock direction="middle" className={dockClassName}>
      {items.map((item) =>
        item.menu ? (
          <MenuDockItem
            key={item.key}
            menu={item.menu}
            side={side}
            renderImage={renderImage}
            itemIcon={item.icon}
            itemLabel={item.label}
          />
        ) : (
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
        )
      )}
    </Dock>
  )
}

export function CategoryDock({
  items,
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
            renderImage={renderImage}
          />
        </div>
      )}
    </>
  )
}
