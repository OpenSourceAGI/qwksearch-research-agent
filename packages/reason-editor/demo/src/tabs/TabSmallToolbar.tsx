/**
 * Demo tab with a compact toolbar and selection bubble menus. Demonstrates a lightweight editing setup.
 */

import { useCallback, useState } from 'react'
import { useEditor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextBubbleText, RichTextBubbleLink } from 'react-reason-editor/bubble'
import { RichTextUndo, RichTextRedo } from 'react-reason-editor/history'
import { RichTextBold } from 'react-reason-editor/bold'
import { RichTextItalic } from 'react-reason-editor/italic'
import { RichTextUnderline } from 'react-reason-editor/textunderline'
import { RichTextStrike } from 'react-reason-editor/strike'
import { RichTextBulletList } from 'react-reason-editor/bulletlist'
import { RichTextOrderedList } from 'react-reason-editor/orderedlist'
import { RichTextHeading } from 'react-reason-editor/heading'
import { RichTextLink } from 'react-reason-editor/link'
import { RichTextClear } from 'react-reason-editor/clear'
import { debounce } from '../../../src/editor-views/components'
import { basicExtensions, DEFAULT_CONTENT } from './shared'

export function TabSmallToolbar() {
  const [content, setContent] = useState(DEFAULT_CONTENT)

  const onValueChange = useCallback(
    debounce((value: string) => setContent(value), 300),
    []
  )

  const editor = useEditor({
    content,
    extensions: basicExtensions,
    onUpdate: ({ editor }) => onValueChange(editor.getHTML()),
  })

  return (
    <div className="flex-1 overflow-auto p-1 flex flex-col items-center gap-1">
      <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col w-full max-w-3xl shadow-sm">
        <RichTextProvider editor={editor!}>
          <div className="flex items-center gap-1 flex-wrap border-b border-gray-200 px-2 py-1.5 bg-gray-50">
            <RichTextUndo />
            <RichTextRedo />
            <span className="w-px h-4 bg-gray-300 mx-0.5 shrink-0" />
            <RichTextHeading />
            <span className="w-px h-4 bg-gray-300 mx-0.5 shrink-0" />
            <RichTextBold />
            <RichTextItalic />
            <RichTextUnderline />
            <RichTextStrike />
            <span className="w-px h-4 bg-gray-300 mx-0.5 shrink-0" />
            <RichTextBulletList />
            <RichTextOrderedList />
            <span className="w-px h-4 bg-gray-300 mx-0.5 shrink-0" />
            <RichTextLink />
            <RichTextClear />
          </div>
          <div className="min-h-48 p-1">
            <EditorContent editor={editor} />
          </div>
          <RichTextBubbleText />
          <RichTextBubbleLink />
        </RichTextProvider>
      </div>

      <div className="w-full max-w-3xl">
        <p className="text-xs font-medium text-gray-500 mb-1">HTML output</p>
        <pre className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap break-all">
          {content}
        </pre>
      </div>
    </div>
  )
}
