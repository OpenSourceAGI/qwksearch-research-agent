/**
 * Example composition wiring the header, toolbar, and editor container into a complete editor. Demonstrates a full-featured editor setup built with the library.
 */

import { useCallback, useEffect, useState } from 'react';
import { useEditor } from '@tiptap/react';
import { Header } from './components/Header';
import { EditorContainer } from './components/EditorContainer';
import { extensions } from './components/extensions';
import { DEFAULT_CONTENT, debounce } from './components/constants';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

function EditorWithToolbar() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [theme, setTheme] = useState('light');

  const onValueChange = useCallback(
    debounce((value: any) => {
      setContent(value);
    }, 300),
    []
  );

  const editor = useEditor({
    textDirection: 'auto',
    content,
    extensions,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onValueChange(html);
    },
  });

  useEffect(() => {
    // @ts-ignore
    window['editor'] = editor;
  }, [editor]);

  return (
    <div className='flex flex-col w-full h-screen'>
      <Header editor={editor} setTheme={setTheme} theme={theme} />
      <EditorContainer editor={editor} theme={theme} setTheme={setTheme} />
    </div>
  );
}

export default EditorWithToolbar;
