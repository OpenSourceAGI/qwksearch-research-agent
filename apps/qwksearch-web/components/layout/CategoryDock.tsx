"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Settings, LogIn, LogOut } from "lucide-react"
import {
  CategoryDock as BaseCategoryDock,
  ThemeMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "category-dock"
import { useSession } from "@/components/ResearchAgent/hooks/useSession"

const NAV_ITEMS = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  { href: "/docs", label: "Docs", icon: "/icons/icon-read.svg" },
]

const iconSettings = "/icons/icon-configure.svg"

export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, signIn, signOut } = useSession()

  const items = NAV_ITEMS.map(({ href, label, icon }) => ({
    key: href,
    label,
    icon,
    active:
      href === "/"
        ? pathname === "/" || pathname.startsWith("/c")
        : pathname.startsWith(href),
    onClick: () => router.push(href),
  }))

  return (
    <BaseCategoryDock
      items={items}
      enableKeyboardShortcuts
      renderImage={(src, alt, size) => (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="w-full h-full" />
      )}
      menu={{
        triggerIcon: iconSettings,
        triggerLabel: "Settings",
        renderContent: () => (
          <>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer py-1 h-7">
              <Settings className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>
            {isAuthenticated ? (
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer py-1 h-7">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span className="text-sm">Logout</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => signIn()} className="cursor-pointer py-1 h-7">
                <LogIn className="mr-2 h-3.5 w-3.5" />
                <span className="text-sm">Login</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <ThemeMenu />
          </>
        ),
      }}
    />
  )
}
