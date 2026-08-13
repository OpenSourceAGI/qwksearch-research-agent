/**
 * Demo tab that enables the Harper grammar and spell checker in the editor. Demonstrates inline writing suggestions.
 */

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { RichTextProvider } from 'react-reason-editor'
import { Harper, RichTextHarper, type HarperIssue } from 'react-reason-editor/harper'

// Intentionally contains spelling and grammar mistakes for Harper to flag.
const DEFAULT_CONTENT = `
  <h1>Harper Proofing Demo</h1>
  <p>This paragraph has a mispelled word and a extra article to proofread.</p>
  <p>Their going to the store, and its going to be a long trip.</p>
  <p>Hover over the underlined text to see suggestions you can apply or ignore.</p>
`

export function TabWithHarper() {
  const [issues, setIssues] = useState<HarperIssue[]>([])
  const [theme, setTheme] = useState('light')

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      Harper.configure({
        debounce: 300,
        onUpdate: setIssues,
      }),
    ],
    content: DEFAULT_CONTENT,
    immediatelyRender: false,
  })

  if (!editor) return null

  return (
    <div className={`flex-1 flex flex-col overflow-hidden h-full gap-4 p-4 ${theme === 'dark' ? 'dark bg-gray-950' : 'bg-white'}`}>
      <RichTextProvider editor={editor} dark={theme === 'dark'}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().runProofing().run()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Check document
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().clearProofing().run()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Toggle theme
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {issues.length} issue{issues.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4">
          <div className="flex-1 overflow-auto">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            </div>
          </div>

          <aside className="w-72 shrink-0 overflow-auto">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Issues
              </h2>
              {issues.length === 0 ? (
                <p className="text-xs text-gray-400">No issues found</p>
              ) : (
                <ul className="space-y-2">
                  {issues.map((issue) => (
                    <li key={issue.id} className="text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {issue.kind}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400"> — {issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </RichTextProvider>

      {/* Floating suggestion tooltip driven by hover over issue decorations */}
      <RichTextHarper editor={editor} />
    </div>
  )
}
