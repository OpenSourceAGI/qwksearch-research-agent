/**
 * Root component of the standalone demo site. Boots the full document-organizer
 * app (sidebar, file tree, editor) with no chrome around it. For the other
 * editor-configuration examples, see alternatives.html.
 */

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { themeActions } from 'react-reason-editor/theme'
import { localeActions } from 'react-reason-editor/locale-bundle'

import 'react-reason-editor/style.css'
import 'katex/dist/katex.min.css'
import 'easydrawer/styles.css'
import 'katex/contrib/mhchem'
import './styles.css'

import { TabFull } from './tabs/TabFull'

export default function App() {
  useEffect(() => {
    localeActions.setLang('en')
    themeActions.setColor('default')
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
        <TabFull />
      </div>
    </ThemeProvider>
  )
}
