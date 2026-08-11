/**
 * The editable surface plus its chrome: toolbar, right-click context menu, and
 * bubble menus. Rendered inside `NovelEditor`'s render prop, so it receives the
 * live editor and the `EditorSurface` component to place in its own layout —
 * Novel owns editor construction, this component owns the arrangement.
 */

import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { RichTextToolbar } from './Toolbar';
import { BubbleMenus } from './BubbleMenus';
import type { NovelEditorApi } from '@/novel/NovelEditor';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Scissors, Clipboard, ClipboardPaste, ClipboardType, Trash2 } from 'lucide-react';

interface EditorContainerProps {
  /** `null` on the first render, before the Novel shell has built the editor. */
  editor: Editor | null;
  /** The editable area, from `NovelEditor`'s render prop. */
  EditorSurface: NovelEditorApi['EditorSurface'];
  theme: string;
  setTheme: (theme: string) => void;
  /** Opens the parent-owned settings modal (config-driven editors only). */
  onOpenSettings?: () => void;
}

export const EditorContainer = ({
  editor,
  EditorSurface,
  theme,
  setTheme,
  onOpenSettings,
}: EditorContainerProps) => {
  const handleCut = useCallback(() => {
    document.execCommand('cut');
  }, []);

  const handleCopy = useCallback(() => {
    document.execCommand('copy');
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor?.commands.insertContent(text);
    } catch {
      document.execCommand('paste');
    }
  }, [editor]);

  const handlePastePlain = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor?.chain().focus().insertContent(text, { parseOptions: { preserveWhitespace: true } }).run();
    } catch {
      document.execCommand('paste');
    }
  }, [editor]);

  const handleDelete = useCallback(() => {
    editor?.commands.deleteSelection();
  }, [editor]);

  return (
    <div className='flex-1 flex flex-col overflow-hidden bg-background'>
      <div className='flex flex-col h-full w-full'>
        {/* The toolbar and bubble menus dereference the editor, so they wait
            for it — the same gate `RichTextProvider` used to apply by
            rendering nothing until its `editor` prop arrived. */}
        {editor && <RichTextToolbar theme={theme} setTheme={setTheme} onOpenSettings={onOpenSettings} />}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className='flex-1 overflow-auto'>
              <EditorSurface className='h-full' />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className='w-56'>
            <ContextMenuItem onClick={handleCut} className='flex items-center gap-3'>
              <Scissors className='h-4 w-4 text-muted-foreground' />
              Cut
              <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopy} className='flex items-center gap-3'>
              <Clipboard className='h-4 w-4 text-muted-foreground' />
              Copy
              <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handlePaste} className='flex items-center gap-3'>
              <ClipboardPaste className='h-4 w-4 text-muted-foreground' />
              Paste
              <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handlePastePlain} className='flex items-center gap-3'>
              <ClipboardType className='h-4 w-4 text-muted-foreground' />
              Paste Plain
              <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleDelete} className='flex items-center gap-3'>
              <Trash2 className='h-4 w-4 text-muted-foreground' />
              Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {editor && <BubbleMenus />}
      </div>
    </div>
  );
};
