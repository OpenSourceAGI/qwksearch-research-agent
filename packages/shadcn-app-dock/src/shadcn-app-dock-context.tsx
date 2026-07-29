/**
 * @fileoverview React context and hooks that let pages register category state into a shared dock and control the dock's visibility.
 *
 * `CategoryDockProvider` holds the currently registered category state plus a
 * localStorage-backed `dockHidden` flag; `useCategoryDock` lets a page register/unregister
 * itself, while `useCategoryDockState` and `useCategoryDockVisibility` expose read access.
 */
"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

interface CategoryState {
  currentCategory: any
  onCategoryChange: (category: any) => void
}

interface CategoryDockContextValue {
  categoryState: CategoryState | null
  register: (state: CategoryState) => void
  unregister: () => void
  dockHidden: boolean
  toggleDock: () => void
}

const CategoryDockContext = createContext<CategoryDockContextValue>({
  categoryState: null,
  register: () => { },
  unregister: () => { },
  dockHidden: false,
  toggleDock: () => { },
})

export function CategoryDockProvider({ children }: { children: ReactNode }) {
  const [categoryState, setCategoryState] = useState<CategoryState | null>(null)
  const [dockHidden, setDockHidden] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dock-hidden')
    if (saved === 'true') setDockHidden(true)
  }, [])

  const toggleDock = useCallback(() => {
    setDockHidden(prev => {
      const next = !prev
      localStorage.setItem('dock-hidden', String(next))
      return next
    })
  }, [])

  const register = useCallback((state: CategoryState) => {
    setCategoryState(state)
  }, [])

  const unregister = useCallback(() => {
    setCategoryState(null)
  }, [])

  return (
    <CategoryDockContext.Provider value={{ categoryState, register, unregister, dockHidden, toggleDock }}>
      {children}
    </CategoryDockContext.Provider>
  )
}

/**
 * Hook for pages to register their category state into the global dock.
 * Call from a page to add category items to the shared dock.
 */
export function useCategoryDock(currentCategory: any, onCategoryChange: (category: any) => void) {
  const { register, unregister } = useContext(CategoryDockContext)

  useEffect(() => {
    register({ currentCategory, onCategoryChange })
  }, [currentCategory, onCategoryChange, register])

  useEffect(() => {
    return () => unregister()
  }, [unregister])
}

export function useCategoryDockState() {
  return useContext(CategoryDockContext).categoryState
}

export function useCategoryDockVisibility() {
  const { dockHidden, toggleDock } = useContext(CategoryDockContext)
  return { dockHidden, toggleDock }
}
