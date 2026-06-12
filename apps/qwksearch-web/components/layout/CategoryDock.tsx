"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Moon, Sun, Monitor, Settings, LogIn, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { themeNames, themeColors, formatThemeName } from "shadcn-theme-menu"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/ResearchAgent/hooks/useSession"
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
const NAV_ITEMS = [
  { href: "/", label: "Research", icon: "/apple-touch-icon.png" },
  { href: "/docs", label: "Docs", icon: "/icons/icon-read.svg" },
]

const iconSettings = "/icons/icon-configure.svg"

function SettingsDockItem({ side }: { side: "bottom" | "top" }) {
  const router = useRouter()
  const { isAuthenticated, signIn, signOut } = useSession()
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("modern-minimal")
  const [mounted, setMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("color-theme")
    if (saved && themeNames.includes(saved)) setColorTheme(saved)
  }, [])

  const handleThemeChange = (name: string) => {
    setColorTheme(name)
    localStorage.setItem("color-theme", name)
    document.cookie = `color-theme=${name}; path=/; max-age=31536000`
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${name}`)
    setPreviewTheme(null)
  }

  const handleThemePreview = (name: string) => {
    setPreviewTheme(name)
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${name}`)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
      document.documentElement.classList.add(`theme-${colorTheme}`)
      setPreviewTheme(null)
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && handlePreviewEnd()}>
      <DropdownMenuTrigger asChild>
        <DockItem className="flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer bg-gray-200 dark:bg-neutral-800">
          <DockLabel>Settings</DockLabel>
          <DockIcon>
            <Image src={iconSettings} alt="settings" width={24} height={24} className="w-full h-full" unoptimized />
          </DockIcon>
        </DockItem>
      </DropdownMenuTrigger>
      {mounted && (
        <DropdownMenuContent side={side} align="end" className="w-56 max-h-[min(400px,70vh)] overflow-y-auto" collisionPadding={8}>
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
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer py-1 h-7">
            <Sun className="mr-2 h-3.5 w-3.5" />
            <span className="text-sm">Light</span>
            {theme === "light" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer py-1 h-7">
            <Moon className="mr-2 h-3.5 w-3.5" />
            <span className="text-sm">Dark</span>
            {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer py-1 h-7">
            <Monitor className="mr-2 h-3.5 w-3.5" />
            <span className="text-sm">System</span>
            {theme === "system" && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
          <div className="text-xs text-muted-foreground px-2 py-1.5">
            Current: {formatThemeName(colorTheme)}
          </div>
          <DropdownMenuSeparator />
          {themeNames.map((name) => {
            const colors = themeColors[name]
            return (
              <DropdownMenuItem
                key={name}
                onClick={() => handleThemeChange(name)}
                onMouseEnter={() => handleThemePreview(name)}
                onMouseLeave={handlePreviewEnd}
                className={cn("cursor-pointer", colorTheme === name && "bg-accent")}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {colors && (
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: colors.primary }} />
                        <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: colors.secondary }} />
                      </div>
                    )}
                    <span>{formatThemeName(name)}</span>
                  </div>
                  {colorTheme === name && <span className="text-xs">✓</span>}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

function DockInstance({
  dockClassName,
  side,
  allItems,
}: {
  dockClassName: string
  side: "bottom" | "top"
  allItems: { key: string; label: string; icon: any; active: boolean; onClick: () => void }[]
}) {
  return (
    <Dock direction="middle" className={dockClassName}>
      {allItems.map(({ key, label, icon, active, onClick }) => (
        <DockItem
          key={key}
          onClick={onClick}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-full transition-colors cursor-pointer",
            active
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-gray-200 dark:bg-neutral-800",
          )}
        >
          <DockLabel>{label}</DockLabel>
          <DockIcon>
            <Image src={icon} alt={label} width={24} height={24} className="w-full h-full" unoptimized />
          </DockIcon>
        </DockItem>
      ))}
      <SettingsDockItem side={side} />
    </Dock>
  )
}

export function CategoryDock() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const numKey = parseInt(event.key, 10)
        if (numKey >= 1 && numKey <= NAV_ITEMS.length) {
          event.preventDefault()
          router.push(NAV_ITEMS[numKey - 1].href)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const allItems = NAV_ITEMS.map(({ href, label, icon }) => ({
    key: href,
    label,
    icon,
    active:
      href === '/'
        ? pathname === '/' || pathname.startsWith('/c')
        : pathname.startsWith(href),
    onClick: () => router.push(href),
  }))

  return (
    <>
      {/* Desktop: top-left corner */}
      <div className="hidden md:block fixed top-0 left-2 z-50">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 !mx-0"
          side="bottom"
          allItems={allItems}
        />
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <DockInstance
          dockClassName="h-[52px] shrink-0 !mt-0 mx-auto w-max mb-2 !gap-1 !p-1"
          side="top"
          allItems={allItems}
        />
      </div>
    </>
  )
}