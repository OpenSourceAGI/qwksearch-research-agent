'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from 'next-themes'
import { themeActions } from 'react-reason-editor/theme'
import { localeActions } from 'react-reason-editor/locale-bundle'

import 'react-reason-editor/style.css'
import 'katex/dist/katex.min.css'
import 'easydrawer/styles.css'
import 'katex/contrib/mhchem'

// ReasonDocs reads localStorage while rendering (sidebar-size persistence),
// which doesn't exist during Next's server render — load it client-only.
const ReasonDocs = dynamic(() => import('react-reason-editor').then((m) => m.ReasonDocs), {
  ssr: false,
})

export default function Page() {
  useEffect(() => {
    localeActions.setLang('en')
    themeActions.setColor('default')
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-full w-full flex-col bg-white dark:bg-gray-950">
        <ReasonDocs />
      </div>
    </ThemeProvider>
  )
}
