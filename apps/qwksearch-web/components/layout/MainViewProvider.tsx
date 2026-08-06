'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type MainViewMode = 'research' | 'docs'

type MainViewContextValue = {
  activeView: MainViewMode
  setActiveView: (view: MainViewMode) => void
  toggleToDocs: () => void
  toggleToResearch: () => void
  /** Bumped whenever the files sidebar should be opened (e.g. from a dock icon). */
  filesSidebarRequestId: number
  requestFilesSidebar: () => void
}

const MainViewContext = createContext<MainViewContextValue | null>(null)

const STORAGE_KEY = 'qwksearch-main-view'

export function MainViewProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<MainViewMode>('research')
  const [filesSidebarRequestId, setFilesSidebarRequestId] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem(STORAGE_KEY) as MainViewMode | null
    if (saved === 'research' || saved === 'docs') {
      setActiveView(saved)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, activeView)
    }
  }, [activeView])

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      toggleToDocs: () => setActiveView('docs'),
      toggleToResearch: () => setActiveView('research'),
      filesSidebarRequestId,
      requestFilesSidebar: () => setFilesSidebarRequestId((id) => id + 1),
    }),
    [activeView, filesSidebarRequestId],
  )

  return <MainViewContext.Provider value={value}>{children}</MainViewContext.Provider>
}

export function useMainView() {
  const context = useContext(MainViewContext)

  if (!context) {
    throw new Error('useMainView must be used within a MainViewProvider')
  }

  return context
}
