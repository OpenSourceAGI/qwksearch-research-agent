/**
 * Demo tab configuring the editor as a small rich-text input box. Demonstrates using the editor for short-form input.
 */

import { useCallback, useState } from 'react'
import { useEditor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { RichTextBubbleText, RichTextBubbleLink } from 'react-reason-editor/bubble'
import { debounce } from '../../../src/editor-views/components'
import { basicExtensions } from './shared'

export function TabInputBox() {
  const [content, setContent] = useState('')

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
      <div className="w-full max-w-xl flex flex-col gap-0.5">
        <label className="text-sm font-medium text-gray-700">Message</label>
        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow bg-white">
          <RichTextProvider editor={editor!}>
            <div className="min-h-[80px] max-h-48 overflow-auto px-1 py-0.5 text-sm">
              <EditorContent editor={editor} />
            </div>
            <RichTextBubbleText />
            <RichTextBubbleLink />
          </RichTextProvider>
        </div>
        <p className="text-xs text-gray-400">Select text to see formatting options. No toolbar is shown.</p>
      </div>

      {content && content !== '<p></p>' && (
        <div className="w-full max-w-xl">
          <p className="text-xs font-medium text-gray-500 mb-1">HTML output</p>
          <pre className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap break-all">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
