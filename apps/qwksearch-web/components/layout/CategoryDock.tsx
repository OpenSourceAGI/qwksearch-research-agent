"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Settings, LogIn, LogOut, Link2, FileText } from "lucide-react"
import * as LucideIcons from "lucide-react"
import {
  CategoryDock as BaseCategoryDock,
  type DockNavItem,
  ThemeMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "shadcn-app-dock"
import { useSession, useChat } from "research-agent-ui"
import { listFooterLinks } from "@/lib/config/site"
import { useSettingsModal } from "@/components/Settings/SettingsModal"
import { useMainView } from "@/components/layout/MainViewProvider"
import iconRead from "../icons/icon-read.svg"
import iconConfigure from "../icons/icon-configure.svg"

const NAV_ITEMS = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  {
    href: "/docs",
    label: "Docs",
    icon: <Image src={iconRead} alt="Docs" width={24} height={24} className="w-full h-full" />,
  },
]

export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, signIn, signOut } = useSession()
  const { newChat } = useChat()
  const { openSettings } = useSettingsModal()
  const { activeView, setActiveView, requestFilesSidebar } = useMainView()

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
    {
      key: "files",
      label: "Files",
      icon: <FileText className="w-full h-full p-1" />,
      onClick: () => {
        setActiveView("docs")
        requestFilesSidebar()
      },
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Image src={iconConfigure} alt="Settings" width={24} height={24} className="w-full h-full" />,
      menu: {
        renderContent: () => (
          <>
            <DropdownMenuItem
              onClick={() => {
                // Open settings in a modal on large desktop screens; otherwise
                // navigate to the /settings route.
                if (!openSettings()) router.push("/settings")
              }}
              className="cursor-pointer py-1 h-7"
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer py-1 h-7">
                <Link2 className="mr-2 h-3.5 w-3.5" />
                <span className="text-sm">Site Links</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {listFooterLinks.map(({ url, text, icon }) => {
                  const IconComponent = icon ? (LucideIcons as any)[icon] : null
                  const isExternal = url.startsWith("http")
                  return (
                    <DropdownMenuItem key={url} asChild className="cursor-pointer py-1 h-7">
                      {isExternal ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {IconComponent && <IconComponent className="mr-2 h-3.5 w-3.5" />}
                          <span className="text-sm">{text}</span>
                        </a>
                      ) : (
                        <Link href={url}>
                          {IconComponent && <IconComponent className="mr-2 h-3.5 w-3.5" />}
                          <span className="text-sm">{text}</span>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
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
