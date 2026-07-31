'use client'

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { ReasonDocs } from 'react-reason-editor'
import { themeActions } from 'react-reason-editor/theme'
import { localeActions } from 'react-reason-editor/locale-bundle'

import 'react-reason-editor/style.css'
import 'katex/dist/katex.min.css'
import 'easydrawer/styles.css'
import 'katex/contrib/mhchem'

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
