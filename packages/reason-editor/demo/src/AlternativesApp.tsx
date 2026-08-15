/**
 * Root component of the alternatives demo page, hosting tabbed examples of the
 * lighter-weight editor configurations (as opposed to the full organizer app,
 * which is the default demo at index.html). Sets up theming and locale for
 * the showcase.
 */

import { useEffect, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { themeActions } from 'react-reason-editor/theme'
import { localeActions } from 'react-reason-editor/locale-bundle'

import 'react-reason-editor/style.css'
import 'katex/dist/katex.min.css'
import 'easydrawer/styles.css'
import 'katex/contrib/mhchem'
import './styles.css'

import { TabEditorOnly } from './tabs/TabEditorOnly'
import { TabSmallToolbar } from './tabs/TabSmallToolbar'
import { TabInputBox } from './tabs/TabInputBox'
import { TabWithToc } from './tabs/TabWithToc'
import { TabWithHarper } from './tabs/TabWithHarper'

const TABS = [
  { id: 'editor-only', label: 'Editor — full toolbar & bubble' },
  { id: 'partial', label: 'Small toolbar — basics' },
  { id: 'input', label: 'Input box — bubble only' },
  { id: 'toc', label: 'Table of Contents — with outline' },
  { id: 'harper', label: 'Harper — proofing' },
]

export default function AlternativesApp() {
  const [activeTab, setActiveTab] = useState('editor-only')

  useEffect(() => {
    localeActions.setLang('en')
    themeActions.setColor('default')
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex flex-col h-screen bg-white dark:bg-gray-950">
        <nav className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 px-4 gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* All tabs stay mounted to preserve editor state; visibility toggled via CSS */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className={activeTab === 'editor-only' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
            <TabEditorOnly />
          </div>
          <div className={activeTab === 'partial' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
            <TabSmallToolbar />
          </div>
          <div className={activeTab === 'input' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
            <TabInputBox />
          </div>
          <div className={activeTab === 'toc' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
            <TabWithToc />
          </div>
          <div className={activeTab === 'harper' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
            <TabWithHarper />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
