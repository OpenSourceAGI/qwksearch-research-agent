/**
 * Example app that assembles the full editor with header, toolbar, and container.
 * Serves as a reference integration of the library's pieces. The editor is
 * driven by a JSON `EditorConfig` whose plugin toggles and settings are edited
 * from the toolbar's Settings modal; changing it rebuilds the extension list
 * while preserving the current content.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import { Header } from './components/Header';
import { EditorContainer } from './components/EditorContainer';
import { SettingsModal } from './config/SettingsModal';
import {
  buildExtensions,
  extensionsSignature,
  loadConfig,
  saveConfig,
  type EditorConfig,
} from './config/editorConfig';
import { localeActions } from 'react-reason-editor/locale-bundle';
import { themeActions } from 'react-reason-editor/theme';
import { externalLibsModeActions } from '@/store/externalLibsMode';
import { DEFAULT_CONTENT, debounce } from './components/constants';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

function App() {
  const [config, setConfig] = useState<EditorConfig>(() => loadConfig());
  const [theme, setTheme] = useState<string>(() => config.theme);
  const [showSettings, setShowSettings] = useState(false);
  const contentRef = useRef<string>(DEFAULT_CONTENT);

  const onValueChange = useCallback(
    debounce((value: string) => {
      contentRef.current = value;
    }, 300),
    []
  );

  useEffect(() => {
    localeActions.setLang(config.language);
  }, [config.language]);

  useEffect(() => {
    themeActions.setColor(config.accentColor);
  }, [config.accentColor]);

  useEffect(() => {
    externalLibsModeActions.setMode(config.externalLibsMode);
  }, [config.externalLibsMode]);

  useEffect(() => {
    setTheme(config.theme);
  }, [config.theme]);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const signature = extensionsSignature(config);
  const extensions = useMemo(() => buildExtensions(config), [signature]);

  const editor = useEditor(
    {
      textDirection: 'auto',
      content: contentRef.current,
      extensions,
      onUpdate: ({ editor }) => {
        onValueChange(editor.getHTML());
      },
    },
    [extensions]
  );

  useEffect(() => {
    (window as any)['editor'] = editor;
  }, [editor]);

  // Track the live editor to snapshot its content before a config-driven rebuild.
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const handleConfigChange = useCallback((next: EditorConfig) => {
    if (editorRef.current && !editorRef.current.isDestroyed) {
      contentRef.current = editorRef.current.getHTML();
    }
    setConfig(next);
  }, []);

  return (
    <div className='flex flex-col w-full h-screen'>
      <Header editor={editor} setTheme={setTheme} theme={theme} />
      <EditorContainer
        editor={editor}
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Rendered outside EditorContainer's provider so it survives the editor
          being rebuilt when a plugin is toggled. */}
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
  );
}

export default App;
