import React, { createContext, useContext, useState } from "react"
import { cn } from "@/lib/utils"

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType>({
  value: "",
  onValueChange: () => {}
})

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "")
  const value = controlledValue ?? internalValue
  const handleChange = onValueChange ?? setInternalValue

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className,
  children
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useContext(TabsContext)
  const isActive = ctx.value === value

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow-sm",
        className
      )}
      onClick={() => ctx.onValueChange(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useContext(TabsContext)
  if (ctx.value !== value) return null

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  )
}
