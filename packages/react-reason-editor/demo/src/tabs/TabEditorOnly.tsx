/**
 * Demo tab presenting just the editor surface with its toolbar and bubble menus.
 * The editor is driven by a JSON `EditorConfig`: the toolbar's Settings modal
 * toggles plugins and edits their settings. Because Tiptap can't add/remove
 * extensions on a live instance, the whole editor subtree is remounted (via a
 * React `key` derived from the enabled-plugins signature) whenever that part of
 * the config changes — a clean teardown/rebuild that never leaves the toolbar
 * or bubble menus holding a stale editor. Content is carried across the remount
 * through a ref. The Settings modal lives outside the keyed subtree so it stays
 * open while plugins are toggled.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { RichTextProvider } from 'react-reason-editor'
import { localeActions } from 'react-reason-editor/locale-bundle'
import { themeActions } from 'react-reason-editor/theme'
import { RichTextToolbar, BubbleMenus, debounce } from '../../../src/editor-views/components'
import {
  buildExtensions,
  extensionsSignature,
  loadConfig,
  saveConfig,
  type EditorConfig,
} from '../../../src/editor-views/config/editorConfig'
import { SettingsModal } from '../../../src/editor-views/config/SettingsModal'
import { DEFAULT_CONTENT } from './shared'

interface EditorInstanceProps {
  config: EditorConfig
  theme: string
  setTheme: (theme: string) => void
  initialContent: string
  onContentChange: (html: string) => void
  onEditorReady: (editor: Editor | null) => void
  onOpenSettings: () => void
}

// A single editor instance built from the current config. Remounted wholesale
// when the plugin signature changes (see the `key` at the call site).
function EditorInstance({
  config,
  theme,
  setTheme,
  initialContent,
  onContentChange,
  onEditorReady,
  onOpenSettings,
}: EditorInstanceProps) {
  const onValueChange = useCallback(
    debounce((value: string) => onContentChange(value), 300),
    []
  )

  const editor = useEditor({
    content: initialContent,
    extensions: buildExtensions(config),
    onUpdate: ({ editor }) => onValueChange(editor.getHTML()),
  })

  useEffect(() => {
    onEditorReady(editor)
    return () => onEditorReady(null)
  }, [editor, onEditorReady])

  return (
    <RichTextProvider editor={editor!} dark={theme === 'dark'}>
      <div className="flex flex-col h-full">
        <RichTextToolbar theme={theme} setTheme={setTheme} onOpenSettings={onOpenSettings} />
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} className="min-h-full" />
        </div>
        <BubbleMenus />
      </div>
    </RichTextProvider>
  )
}

export function TabEditorOnly() {
  const [config, setConfig] = useState<EditorConfig>(() => loadConfig())
  const [theme, setTheme] = useState<string>(() => config.theme)
  const [showSettings, setShowSettings] = useState(false)

  // Carries the latest HTML across editor remounts so toggling a plugin doesn't
  // discard the user's content.
  const contentRef = useRef<string>(DEFAULT_CONTENT)
  const editorRef = useRef<Editor | null>(null)

  useEffect(() => {
    localeActions.setLang(config.language)
  }, [config.language])

  useEffect(() => {
    themeActions.setColor(config.accentColor)
  }, [config.accentColor])

  useEffect(() => {
    setTheme(config.theme)
  }, [config.theme])

  useEffect(() => {
    saveConfig(config)
  }, [config])

  const handleContentChange = useCallback((html: string) => {
    contentRef.current = html
  }, [])

  const handleEditorReady = useCallback((editor: Editor | null) => {
    if (editor) editorRef.current = editor
  }, [])

  const handleConfigChange = useCallback((next: EditorConfig) => {
    // Snapshot content before a plugin change remounts the editor.
    if (editorRef.current && !editorRef.current.isDestroyed) {
      contentRef.current = editorRef.current.getHTML()
    }
    setConfig(next)
  }, [])

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      <EditorInstance
        key={extensionsSignature(config)}
        config={config}
        theme={theme}
        setTheme={setTheme}
        initialContent={contentRef.current}
        onContentChange={handleContentChange}
        onEditorReady={handleEditorReady}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Outside the keyed subtree so it stays open while plugins are toggled. */}
      {showSettings && (
        <SettingsModal
          config={config}
          onConfigChange={handleConfigChange}
          onClose={() => setShowSettings(false)}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  )
}
