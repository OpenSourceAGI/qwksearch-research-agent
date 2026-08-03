/**
 * Header bar for the example editor with theme and locale switchers. Lets users toggle appearance and language in the demo.
 */

import { useEffect, useState } from 'react';
import { localeActions, useLocale } from 'react-reason-editor/locale-bundle';
import { themeActions, useTheme } from 'react-reason-editor/theme';
import type { Editor } from '@tiptap/react';

interface HeaderProps {
  editor: Editor | null;
  theme: string;
  setTheme: (theme: string) => void;
}

export const Header = ({ editor, theme: _theme, setTheme: _setTheme }: HeaderProps) => {
  const [_editorEditable, setEditorEditable] = useState(false);
  const _currentLocale = useLocale();
  const _currentTheme = useTheme();

  useEffect(() => {
    themeActions.setColor('default');
    setEditorEditable(editor?.isEditable ?? true);
  }, []);

  useEffect(() => {
    if (editor) {
      editor.on('update', () => {
        setEditorEditable(editor.isEditable);
      });
    }

    return () => {
      if (editor) {
        editor.off('update', () => {
          setEditorEditable(editor.isEditable);
        });
      }
    };
  }, [editor]);

  return null;
};
