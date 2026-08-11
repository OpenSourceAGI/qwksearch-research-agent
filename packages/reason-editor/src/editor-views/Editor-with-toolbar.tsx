/**
 * Example composition wiring the header, toolbar, and editor container into a
 * complete editor. The editor itself is mounted by `NovelEditor` — Novel's
 * `EditorRoot`/`EditorContent` shell — with this package's full extension set
 * passed in, so the toolbar and bubble menus are unchanged.
 */

import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { EditorContainer } from './components/EditorContainer';
import { extensions } from './components/extensions';
import { DEFAULT_CONTENT, debounce } from './components/constants';
import { NovelEditor } from '@/novel/NovelEditor';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

function EditorWithToolbar() {
  const [_content, setContent] = useState(DEFAULT_CONTENT);
  const [theme, setTheme] = useState('light');
  const [editor, setEditor] = useState<any>(null);

  const onValueChange = useCallback(
    debounce((value: any) => {
      setContent(value);
    }, 300),
    []
  );

  useEffect(() => {
    // @ts-ignore
    window['editor'] = editor;
  }, [editor]);

  return (
    <div className='flex flex-col w-full h-screen'>
      <NovelEditor
        className='flex flex-1 min-h-0 flex-col'
        extensions={extensions}
        initialContent={DEFAULT_CONTENT}
        textDirection='auto'
        onEditor={setEditor}
        onUpdate={({ editor: e }) => onValueChange(e.getHTML())}
      >
        {({ editor: currentEditor, EditorSurface }) => (
          <>
            <Header editor={currentEditor} setTheme={setTheme} theme={theme} />
            <EditorContainer
              editor={currentEditor}
              EditorSurface={EditorSurface}
              theme={theme}
              setTheme={setTheme}
            />
          </>
        )}
      </NovelEditor>
    </div>
  );
}

export default EditorWithToolbar;
