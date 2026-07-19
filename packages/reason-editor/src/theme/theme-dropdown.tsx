"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useTheme } from "next-themes"
import Icon from "../lexical/ui/Icon"

const themeNames = [
  "modern-minimal",
  "elegant-luxury",
  "cyberpunk",
  "twitter",
  "mocha-mousse",
  "amethyst-haze",
  "notebook",
  "doom-64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "cosmic-night",
  "tangerine",
  "nature",
  "bold-tech",
  "amber-minimal",
  "supabase",
  "neo-brutalism",
  "quantum-rose",
  "solar-dusk",
  "bubblegum",
  "pink-lemonade",
  "claymorphism",
  "pastel-dreams"
];

const themeColors: Record<string, { primary: string; secondary: string }> = {
  "modern-minimal": { primary: "#3b82f6", secondary: "#f3f4f6" },
  "elegant-luxury": { primary: "#9b2c2c", secondary: "#fdf2d6" },
  "cyberpunk": { primary: "#ff00c8", secondary: "#f0f0ff" },
  "twitter": { primary: "#1e9df1", secondary: "#0f1419" },
  "mocha-mousse": { primary: "#A37764", secondary: "#BAAB92" },
  "bubblegum": { primary: "#d04f99", secondary: "#8acfd1" },
  "amethyst-haze": { primary: "#8a79ab", secondary: "#dfd9ec" },
  "pink-lemonade": { primary: "#a84370", secondary: "#f1c4e6" },
  "notebook": { primary: "#606060", secondary: "#dedede" },
  "doom-64": { primary: "#b71c1c", secondary: "#556b2f" },
  "catppuccin": { primary: "#8839ef", secondary: "#ccd0da" },
  "graphite": { primary: "#606060", secondary: "#e0e0e0" },
  "perpetuity": { primary: "#06858e", secondary: "#d9eaea" },
  "kodama-grove": { primary: "#8d9d4f", secondary: "#decea0" },
  "cosmic-night": { primary: "#6e56cf", secondary: "#e4dfff" },
  "tangerine": { primary: "#e05d38", secondary: "#f3f4f6" },
  "quantum-rose": { primary: "#e6067a", secondary: "#ffd6ff" },
  "nature": { primary: "#2e7d32", secondary: "#e8f5e9" },
  "bold-tech": { primary: "#8b5cf6", secondary: "#f3f0ff" },
  "amber-minimal": { primary: "#f59e0b", secondary: "#f3f4f6" },
  "supabase": { primary: "#72e3ad", secondary: "#fdfdfd" },
  "neo-brutalism": { primary: "#ff3333", secondary: "#ffff00" },
  "solar-dusk": { primary: "#B45309", secondary: "#E4C090" },
  "claymorphism": { primary: "#6366f1", secondary: "#d6d3d1" },
  "pastel-dreams": { primary: "#a78bfa", secondary: "#e9d8fd" }
};

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("modern-minimal")
  const [mounted, setMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("color-theme")
    if (saved && themeNames.includes(saved)) {
      setColorTheme(saved)
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("color-theme", newTheme)
    document.cookie = `color-theme=${newTheme}; path=/; max-age=31536000`

    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add new theme class
    document.documentElement.classList.add(`theme-${newTheme}`)

    setPreviewTheme(null)
  }

  const handleThemePreview = (themeName: string) => {
    setPreviewTheme(themeName)
    // Remove all theme classes
    themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
    // Add preview theme class
    document.documentElement.classList.add(`theme-${themeName}`)
  }

  const handlePreviewEnd = () => {
    if (previewTheme) {
      // Restore the actual selected theme
      themeNames.forEach(t => document.documentElement.classList.remove(`theme-${t}`))
      document.documentElement.classList.add(`theme-${colorTheme}`)
      setPreviewTheme(null)
    }
  }

  const formatThemeName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const toggleLightDark = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return null
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && handlePreviewEnd()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon
            name="icon-themes"
            size={20}
            className="h-5 w-5"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Theme</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              toggleLightDark()
            }}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="text-xs text-muted-foreground px-2 py-1.5">
          Current: {formatThemeName(colorTheme)}
        </div>
        <DropdownMenuSeparator />
        {themeNames.map((themeName) => {
          const colors = themeColors[themeName];
          return (
            <DropdownMenuItem
              key={themeName}
              onClick={() => handleThemeChange(themeName)}
              onMouseEnter={() => handleThemePreview(themeName)}
              onMouseLeave={handlePreviewEnd}
              className={`cursor-pointer ${colorTheme === themeName ? "bg-accent" : ""
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {colors && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: colors.secondary }}
                      />
                    </div>
                  )}
                  <span>{formatThemeName(themeName)}</span>
                </div>
                {colorTheme === themeName && (
                  <span className="text-xs">✓</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
