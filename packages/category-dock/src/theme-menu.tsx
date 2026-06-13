"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { themeNames, themeColors, formatThemeName } from "shadcn-theme-menu"

import { cn } from "./lib/utils"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./components/dropdown-menu"

export interface ThemeMenuProps {
  /** Show the light/dark/system appearance toggle above the color themes. Default true. */
  showAppearance?: boolean
  /** Default color theme applied when nothing is persisted. Default "modern-minimal". */
  defaultColorTheme?: string
}

/**
 * Composable shadcn theme switcher rendered as a fragment of dropdown items.
 * Drop it inside any `DropdownMenuContent` (e.g. via `CategoryDock`'s menu render prop).
 *
 * Handles the light/dark/system appearance toggle (via next-themes) and the shadcn
 * color-theme picker with hover preview, persisting the selection to localStorage and a
 * cookie and toggling the `theme-<name>` class on the document element.
 */
export function ThemeMenu({
  showAppearance = true,
  defaultColorTheme = "modern-minimal",
}: ThemeMenuProps = {}) {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState(defaultColorTheme)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  useEffect(() => {
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
    <>
      {showAppearance && (
        <>
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
        </>
      )}
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
    </>
  )
}
