"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Settings, LogIn, LogOut, FileText, Search } from "lucide-react"
import {
  CategoryDock as BaseCategoryDock,
  type DockNavItem,
  ThemeMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "shadcn-app-dock"
import { useSession } from "../hooks/useSession"
import { useChat } from "../hooks/useChat"
import { researchAgentUIConfig } from "../config"
import { useMainView } from "./MainViewProvider"
import { openSpotlight } from "../components/SpotlightPalette"
// Both dock marks are SVGs, and next/image refuses to run SVG through the
// optimizer unless `dangerouslyAllowSVG` is on — the request 400s and the dock
// renders two broken-image glyphs. They are already tiny inline-able assets, so
// every <Image> below opts out of optimization (same as `renderImage` does for
// the app icon) and serves the file as-is.
import iconRead from "../icons/icon-read.svg"
import iconConfigure from "../icons/icon-configure.svg"

export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, signIn, signOut } = useSession()
  const { newChat } = useChat()
  const { activeView, setActiveView, docsEnabled, requestFilesSidebar } = useMainView()

  // The Docs entry is only reachable in the build that bundles the REASON
  // editor — in the chat-only build there is no document surface to switch to.
  const NAV_ITEMS = [
    { href: "/", label: "Research", icon: researchAgentUIConfig.appIconUrl },
    ...(docsEnabled
      ? [
          {
            href: "/workspace",
            label: "Docs",
            icon: (
              <Image
                src={iconRead}
                alt="Docs"
                width={24}
                height={24}
                unoptimized
                className="w-full h-full"
              />
            ),
          },
        ]
      : []),
  ]

  const isOnResearch = pathname === "/" || pathname.startsWith("/c")

  const items: DockNavItem[] = [
    ...NAV_ITEMS.map(({ href, label, icon }) => ({
      key: href,
      label,
      icon,
      active:
        href === "/"
          ? activeView === "research"
          : activeView === "docs",
      onClick: () => {
        if (href === "/") {
          setActiveView("research")
          if (isOnResearch) {
            newChat()
          }
          return
        }

        setActiveView("docs")
      },
    })),
    ...(docsEnabled
      ? [
          {
            key: "files",
            label: "Files",
            icon: <FileText className="w-full h-full p-1" />,
            onClick: () => {
              setActiveView("docs")
              requestFilesSidebar()
            },
          },
        ]
      : []),
    {
      key: "settings",
      label: "Settings",
      icon: (
        <Image
          src={iconConfigure}
          alt="Settings"
          width={24}
          height={24}
          unoptimized
          className="w-full h-full"
        />
      ),
      menu: {
        renderContent: () => (
          <>
            {/* The spotlight palette is keyboard-first, so the dock carries
                the one pointer-reachable way in — and advertises the chord. */}
            <DropdownMenuItem onClick={() => openSpotlight()} className="cursor-pointer py-1 h-7">
              <Search className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Search everything</span>
              <span className="ml-auto pl-3 text-[10px] text-muted-foreground">Ctrl Space</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // Open settings in a modal on large desktop screens; otherwise
                // navigate to the /settings route.
                if (!researchAgentUIConfig.onOpenSettings?.()) router.push("/settings")
              }}
              className="cursor-pointer py-1 h-7"
            >
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
      },
    },
  ]

  // The "Files" shortcut only makes sense on mobile, where REASON's file
  // sidebar isn't otherwise reachable at a glance — on desktop it's always
  // visible in the persistent sidebar, so the dock icon would be redundant.
  const desktopItems = items.filter((item) => item.key !== "files")
  const renderImage = (src: string, alt: string, size: number) => (
    <Image src={src} alt={alt} width={size} height={size} unoptimized className="w-full h-full" />
  )

  return (
    <>
      <BaseCategoryDock
        items={desktopItems}
        enableKeyboardShortcuts
        placements={{ desktop: true, mobile: false }}
        renderImage={renderImage}
      />
      <BaseCategoryDock
        items={items}
        placements={{ desktop: false, mobile: true }}
        mobileAlign={activeView === "docs" ? "end" : "center"}
        renderImage={renderImage}
      />
    </>
  )
}
