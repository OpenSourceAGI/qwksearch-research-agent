/**
 * Demo tab showing the editor alongside a live table-of-contents outline. Demonstrates heading-based navigation.
 */

import { useCallback, useMemo, useState } from 'react'
import { useEditor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Heading from '@tiptap/extension-heading'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import UniqueID from '@tiptap/extension-unique-id'
import TableOfContents, { getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { common, createLowlight } from 'lowlight'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextToolbar, BubbleMenus, debounce } from '../../../src/editor-views/components'

type TocItem = {
  id: string
  textContent: string
  level: number
  isActive: boolean
  isScrolledOver: boolean
}

const DEFAULT_CONTENT = `
  <h1>Table of Contents Demo</h1>
  <p>This editor demonstrates an outline sidebar that automatically updates as you edit headings.</p>

  <h2>Getting Started</h2>
  <p>The outline panel on the left shows all headings in your document.</p>

  <h2>Features</h2>
  <p>Click on any heading in the outline to jump to it.</p>

  <h3>Active Highlighting</h3>
  <p>The outline highlights which section you're currently viewing.</p>

  <h3>Scroll Tracking</h3>
  <p>Headings fade as you scroll past them, showing your reading progress.</p>

  <h2>Try Editing</h2>
  <p>Add new headings or modify existing ones to see the outline update in real-time.</p>
`

export function TabWithToc() {
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [toc, setToc] = useState<TocItem[]>([])
  const [theme, setTheme] = useState('light')
  const [showToc, setShowToc] = useState(true)

  const onValueChange = useCallback(
    debounce((value: string) => setContent(value), 300),
    []
  )

  const lowlight = createLowlight(common)

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Strike,
      Code,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link,
      Image,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      HorizontalRule,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      UniqueID.configure({
        types: ['heading'],
      }),
      TableOfContents.configure({
        anchorTypes: ['heading'],
        getIndex: getHierarchicalIndexes,
        onUpdate: anchors => {
          setToc(
            anchors.map(item => ({
              id: item.id,
              textContent: item.textContent,
              level: item.level,
              isActive: item.isActive,
              isScrolledOver: item.isScrolledOver,
            })),
          )
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => onValueChange(editor.getHTML()),
  })

  const items = useMemo(
    () => toc.filter(item => item.textContent?.trim()),
    [toc],
  )

  if (!editor) return null

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden h-full gap-1 p-1 ${theme === 'dark' ? 'dark' : 'bg-white dark:bg-gray-950'}`}>
      <RichTextProvider editor={editor!} dark={theme === 'dark'}>
        <div className="flex items-center justify-between shrink-0">
          <RichTextToolbar theme={theme} setTheme={setTheme} />
          <label className="flex items-center gap-2 cursor-pointer pr-2">
            <input
              type="checkbox"
              checked={showToc}
              onChange={(e) => setShowToc(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Show Outline</span>
          </label>
        </div>

        <div className="flex-1 overflow-hidden flex gap-1">
          {/* TOC Sidebar */}
          {showToc && <aside className="w-64 shrink-0 overflow-auto">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-sm sticky top-0">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Outline
              </h2>

              <nav className="space-y-1">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">No headings yet</p>
                ) : (
                  items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={[
                        'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                        item.level === 2 ? 'ml-3' : item.level === 3 ? 'ml-6' : '',
                        item.isActive
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium'
                          : item.isScrolledOver
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                      ].join(' ')}
                    >
                      {item.textContent}
                    </button>
                  ))
                )}
              </nav>
            </div>
          </aside>
          }

          {/* Editor */}
          <div className="flex-1 overflow-auto">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-sm">
              <EditorContent
                editor={editor}
                className="
                  prose prose-sm dark:prose-invert max-w-none
                  prose-headings:scroll-mt-24
                  prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4
                  prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:mb-3
                  dark:prose-headings:text-white
                "
              />
            </div>
          </div>
        </div>

        <BubbleMenus />
      </RichTextProvider>
    </div>
  )
}
