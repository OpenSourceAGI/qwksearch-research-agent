/**
 * Example app that assembles the full editor with header, toolbar, and container.
 * Serves as a reference integration of the library's pieces. The editor is
 * mounted by `NovelEditor` (Novel's `EditorRoot`/`EditorContent` shell) and
 * driven by a JSON `EditorConfig` whose plugin toggles and settings are edited
 * from the toolbar's Settings modal; changing it rebuilds the extension list
 * while preserving the current content.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { NovelEditor } from '@/novel/NovelEditor';
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

  // Track the live editor so its content can be snapshotted before a
  // config-driven rebuild, and for the demo's `window.editor` handle.
  const editorRef = useRef<any>(null);
  const handleEditor = useCallback((editor: any) => {
    editorRef.current = editor;
    (window as any)['editor'] = editor;
  }, []);

  const handleConfigChange = useCallback((next: EditorConfig) => {
    if (editorRef.current && !editorRef.current.isDestroyed) {
      contentRef.current = editorRef.current.getHTML();
    }
    setConfig(next);
  }, []);

  return (
    <div className='flex flex-col w-full h-screen'>
      <NovelEditor
        className='flex flex-1 min-h-0 flex-col'
        extensions={extensions}
        // Novel's `EditorContent` wraps `EditorProvider`, which builds the
        // editor once and never rebuilds it when `extensions` changes. Keying
        // on the signature remounts the surface for the new schema, which is
        // what the previous `useEditor(options, [extensions])` did.
        rebuildKey={signature}
        initialContent={contentRef.current}
        textDirection='auto'
        onEditor={handleEditor}
        onUpdate={({ editor }) => onValueChange(editor.getHTML())}
      >
        {({ editor, EditorSurface }) => (
          <>
            <Header editor={editor} setTheme={setTheme} theme={theme} />
            <EditorContainer
              editor={editor}
              EditorSurface={EditorSurface}
              theme={theme}
              setTheme={setTheme}
              onOpenSettings={() => setShowSettings(true)}
            />
          </>
        )}
      </NovelEditor>

      {/* Rendered outside the editor shell so it survives the editor being
          rebuilt when a plugin is toggled. */}
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
